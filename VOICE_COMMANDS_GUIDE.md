# 🎤 AD Helper Voice Commands Guide

This guide explains how to use the voice commands feature in AD Helper for hands-free operation.

---

## 📋 Prerequisites

Before using voice commands, ensure the following:

### 1. Microphone Setup
- A working microphone must be connected to your computer
- The microphone must be set as the **default audio input device**
- To check: **Settings → System → Sound → Input**

### 2. Windows Speech Recognition
- Windows Speech Recognition must be enabled
- **Windows 10/11**: Settings → Time & Language → Speech
- Ensure "Online speech recognition" is turned **ON**

### 3. Test Your Speech Setup
Run this command in PowerShell to verify speech works:
```powershell
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.Speak("Speech is working")
```
If you hear "Speech is working", your system is ready.

---

## 🚀 How to Start Voice Commands Mode

1. **Launch AD Helper**
   - Double-click `ADHelper_App.bat` or `ADHelper_`
   - Log in with your credentials

2. **Select Option 6** from the main menu
   ```
   [6] Voice Commands Mode
   ```

3. **Confirm Activation**
   - When prompted: `Enable voice recognition? (Y/N)`
   - Type `Y` and press Enter

4. **Wait for Confirmation**
   - You should see: `✅ Voice recognition initialized.`
   - Then: `🎤 Listening for voice commands...`

5. **Speak Your Command**
   - Speak clearly into your microphone
   - Wait for the system to recognize your command

---

## 🗣️ Available Voice Commands

| Voice Command | Alternative Phrases | What It Does |
|---------------|---------------------|--------------|
| **"process user"** | "handle user" | Opens the user processing workflow (validation → groups → proxies) |
| **"reset password"** | "password reset" | Initiates password reset for a user |
| **"unlock account"** | "account unlock" | Unlocks a locked user account |
| **"create account"** | "new user" | Starts the new user creation wizard |
| **"validate attributes"** | "check user" | Validates user attributes only |
| **"add to groups"** | "group membership" | Adds a user to groups |
| **"fix proxy addresses"** | "proxy address" | Fixes proxy address issues |
| **"show help"** | "help", "what can do" | Displays available commands |
| **"exit"** | "quit", "bye" | Exits voice commands mode |

---

## 💡 Tips for Best Results

1. **Speak Clearly** - Use a normal speaking voice, not too fast
2. **Wait for Silence** - The system has a 3-second timeout for initial silence
3. **Use Exact Phrases** - Stick to the commands listed above
4. **Quiet Environment** - Reduce background noise for better recognition
5. **One Command at a Time** - Speak one command, wait for response

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Failed to initialize voice recognition" | Check microphone connection and default device settings |
| Commands not recognized | Speak more clearly, reduce background noise |
| "Voice recognition not available" | Windows Speech Recognition may not be installed or enabled |
| No response after speaking | Check if microphone is muted; try speaking louder |
| Wrong command recognized | Try using the alternative phrase from the table above |

### Check Microphone in Windows
1. Right-click the speaker icon in the taskbar
2. Select "Sound settings"
3. Under "Input", ensure your microphone is selected
4. Speak and verify the input level bar moves

### Re-enable Windows Speech
1. Open **Settings**
2. Go to **Time & Language → Speech**
3. Toggle "Online speech recognition" OFF then ON
4. Restart AD Helper

---

## ❌ How to Exit Voice Mode

Use any of these methods:
- Say **"exit"**, **"quit"**, or **"bye"**
- Press **Enter** to return to the main menu

---

## 📞 Support

If voice commands continue to have issues:
1. Verify all prerequisites are met
2. Test speech with the PowerShell command above
3. Try restarting AD Helper
4. Check Windows Event Viewer for speech-related errors

---

*Voice Commands feature is experimental and may not work in all environments.*

