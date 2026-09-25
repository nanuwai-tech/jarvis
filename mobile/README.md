# Jarvis Voice AI - Mobile Application (Flutter)

A cross-platform Flutter application for Android and iOS that connects to the Jarvis Voice AI agent via LiveKit Cloud.

## Prerequisites
- [Flutter SDK](https://docs.flutter.dev/get-started/install) (3.0+)
- Android Studio / Xcode for emulators and physical device builds.

## Setup Instructions

1. **Configure Token Credentials**:
   Copy `assets/.env.example` to `assets/.env`:
   ```bash
   cp assets/.env.example assets/.env
   ```
2. **Get your LiveKit Sandbox ID**:
   - Go to [LiveKit Cloud Dashboard](https://cloud.livekit.io) -> Project Settings.
   - Toggle on **Development token server**.
   - Copy the **Sandbox ID** and paste into `assets/.env`:
     ```env
     LIVEKIT_SANDBOX_ID=your-sandbox-id-here
     ```

3. **Install Dependencies**:
   ```bash
   flutter pub get
   ```

4. **Run the App**:
   ```bash
   # List available devices (Android/iOS/Simulator)
   flutter devices

   # Run on connected device
   flutter run -d <device_id>
   ```

5. **Ensure the Agent is Running**:
   In another terminal, ensure the Jarvis Python agent is active:
   ```bash
   uv run source/agent.py dev
   ```
