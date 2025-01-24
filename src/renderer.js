const { ipcRenderer } = require("electron");
const MicRecorder = require("mic-recorder-to-mp3");
const { clipboard } = require("electron");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");
const marked = require("marked");

// DOM Elements
const status = document.getElementById("status");
const result = document.getElementById("result");
const recordButton = document.getElementById("recordButton");

// Additional DOM Elements
const translateButton = document.getElementById("translateButton");
const taskButton = document.getElementById("taskButton");

// State variables
let GEMINI_API_KEY;
let genAI;
let recorder = new MicRecorder({
  bitRate: 128,
  channels: 2,
  sampleRate: 44100,
});
let isRecording = false;
let shouldTranslate = false;
let isTaskRecording = false;

// Initialize API client
ipcRenderer
  .invoke("get-api-key")
  .then((key) => {
    GEMINI_API_KEY = key;
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    recordButton.disabled = false;
    status.textContent = "Ready to record";
  })
  .catch((err) => {
    console.error("Failed to load API key:", err);
    status.textContent = "Error: Missing API key - check config!";
    ipcRenderer.invoke("show-notification", {
      title: "Config Error",
      body: "API key missing - check configuration!",
    });
  });

// Event Handlers
recordButton.addEventListener("click", toggleRecording);
ipcRenderer.on("recording-toggle", (_, translate) =>
  handleIPCRecording(translate)
);
ipcRenderer.on("record-task", handleTaskRecording);

// Add click handlers for new buttons
translateButton.addEventListener("click", () => handleIPCRecording(true));
taskButton.addEventListener("click", handleTaskRecording);

async function toggleRecording() {
  if (!isRecording) {
    await startRecording({ translate: false, isTask: false });
  } else {
    await stopRecording();
  }
}

async function handleIPCRecording(translate) {
  if (!isRecording) {
    await startRecording({ translate, isTask: false });
  } else {
    await stopRecording();
  }
}

async function handleTaskRecording() {
  if (!isRecording) {
    await startRecording({ translate: false, isTask: true });
  } else {
    await stopRecording();
  }
}

async function startRecording({ translate, isTask }) {
  if (!genAI) {
    status.textContent = "Initializing... Please wait";
    return;
  }

  if (!(await checkMicrophonePermission())) {
    status.textContent = "Microphone access required!";
    return;
  }

  status.textContent = isTask
    ? "Recording task..."
    : translate
    ? "Recording (translating)..."
    : "Recording...";
  recordButton.textContent = "Stop Recording";
  recordButton.classList.add("recording");
  updateButtonStates(false);
  isRecording = true;
  shouldTranslate = translate;
  isTaskRecording = isTask;

  try {
    await recorder.start();
    ipcRenderer.invoke("show-notification", {
      title: "Voice2Text",
      body: isTask
        ? "Task recording started"
        : translate
        ? "Recording with translation"
        : "Recording started",
    });
  } catch (err) {
    console.error("Recording error:", err);
    status.textContent = "Recording failed - check microphone";
    resetUI();
  }
}

async function stopRecording() {
  status.textContent = "Processing...";
  updateButtonStates(true);
  isRecording = false;

  try {
    const [buffer, blob] = await recorder.stop().getMp3();
    const transcription = await transcribeAudio(
      blob,
      shouldTranslate,
      isTaskRecording
    );

    displayResult(transcription);

    if (isTaskRecording) {
      const saved = await saveToTasksFile(transcription);
      if (saved) {
        status.textContent = "Task saved successfully!";
        ipcRenderer.invoke("show-notification", {
          title: "Task Saved",
          body: "Successfully saved to tasks file",
        });
      } else {
        status.textContent = "Error saving task!";
      }
    } else {
      clipboard.writeText(transcription);
      status.textContent = "Text copied to clipboard!";
      ipcRenderer.invoke("show-notification", {
        title: "Success",
        body: shouldTranslate
          ? "Translated text copied"
          : "Transcription copied",
      });
    }

    setTimeout(resetUI, 2000);
  } catch (err) {
    console.error("Processing error:", err);
    status.textContent = `Error: ${err.message}`;
    resetUI();
  }
}

function resetUI() {
  status.textContent =
    "Press the button or use keyboard shortcuts to start recording";
  recordButton.textContent = "Start Recording";
  recordButton.classList.remove("recording");
  updateButtonStates(false);
  isRecording = false;
  shouldTranslate = false;
  isTaskRecording = false;
}

function updateButtonStates(disabled) {
  recordButton.disabled = disabled;
  translateButton.disabled = disabled;
  taskButton.disabled = disabled;
}

async function checkMicrophonePermission() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    ipcRenderer.invoke("show-notification", {
      title: "Permission Required",
      body: "Please enable microphone access in system settings",
    });
    return false;
  }
}

function displayResult(text) {
  const timestamp = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // Use marked to render Markdown if it's a task
  const contentHtml = isTaskRecording
    ? `<div class="markdown-content">${marked.parse(text)}</div>`
    : `<div>${text.replace(/\n/g, "<br>")}</div>`;

  result.innerHTML = `
    <div class="result-container">
      <div class="header">
        <div class="header-left">
          <h3>${isTaskRecording ? "TASK" : "RESULT"}</h3>
          <button class="result-action-button" onclick="window.copyResult()">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Copy
          </button>
          <button class="result-action-button" onclick="window.clearResult()">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18"></path>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Clear
          </button>
        </div>
        <div class="header-right">
          <span class="timestamp">${timestamp}</span>
        </div>
      </div>
      <div class="content">
        ${contentHtml}
      </div>
    </div>
  `;

  // Store the current text for copy functionality
  window.currentResultText = text;
}

// Add global functions for the buttons
window.copyResult = () => {
  if (window.currentResultText) {
    clipboard.writeText(window.currentResultText);
    ipcRenderer.invoke("show-notification", {
      title: "Success",
      body: "Text copied to clipboard",
    });
  }
};

window.clearResult = () => {
  result.innerHTML = "";
  window.currentResultText = null;
};

// Task template prompt
const TASK_TEMPLATE_PROMPT = `Analyze the following completed task description and format it as a task completion record using this template:

# Completed Task
[Brief description of what was completed]

## Implementation Details
- **Type**: [Type of work: Feature/Bug Fix/Enhancement/Documentation]
- **Time Spent**: [Approximate time spent]
- **Completion Date**: [Current date]

## Changes Made
- [Main change/implementation 1]
- [Main change/implementation 2]

## Technical Notes
[Technical details, architectural decisions, or important implementation notes]

## Testing
- [Testing performed 1]
- [Testing performed 2]

## Related Items
- [Related tasks, issues, or dependencies]

Please analyze the audio transcription describing the completed work and fill this template appropriately, maintaining a professional tone.
Return ONLY the formatted markdown without any additional text.`;

async function transcribeAudio(blob, translate, isTask = false) {
  if (!genAI) throw new Error("API client not ready");

  try {
    const base64Audio = Buffer.from(await blob.arrayBuffer()).toString(
      "base64"
    );
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    let prompt;
    if (isTask) {
      prompt = "TRANSCRIBE THIS AUDIO AND THEN " + TASK_TEMPLATE_PROMPT;
    } else if (translate) {
      prompt =
        "TRANSCRIBE AND TRANSLATE TO ENGLISH. RETURN ONLY TRANSLATED TEXT:";
    } else {
      prompt = "TRANSCRIBE THIS AUDIO. RETURN ONLY RAW TEXT:";
    }

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Audio,
          mimeType: "audio/mpeg",
        },
      },
    ]);

    const text = (await result.response)
      .text()
      .trim()
      .replace(/^\s*[\r\n]/gm, "")
      .replace(/(\S)\n(\S)/g, "$1 $2");

    clipboard.writeText(text);
    ipcRenderer.send("auto-paste");
    return text;
  } catch (err) {
    console.error("Transcription failed:", err);
    throw new Error("Transcription error - try again");
  }
}

async function saveToTasksFile(text) {
  try {
    const timestamp = new Date().toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    // Create a filename-safe timestamp
    const safeTimestamp = timestamp
      .replace(/[/:]/g, "-")
      .replace(/,/g, "")
      .replace(/\s+/g, "_");

    const tasksDir = await ipcRenderer.invoke("get-tasks-path");

    // Ensure Tasks directory exists
    if (!fs.existsSync(tasksDir)) {
      fs.mkdirSync(tasksDir, { recursive: true });
    }

    // Create a new file for this task with the formatted content directly
    const taskPath = path.join(tasksDir, `task_${safeTimestamp}.md`);
    fs.writeFileSync(taskPath, text);

    return true;
  } catch (err) {
    console.error("Save error:", err);
    return false;
  }
}
