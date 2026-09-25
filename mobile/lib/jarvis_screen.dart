import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import 'package:livekit_client/livekit_client.dart';
import 'package:permission_handler/permission_handler.dart';

class JarvisScreen extends StatefulWidget {
  const JarvisScreen({super.key});

  @override
  State<JarvisScreen> createState() => _JarvisScreenState();
}

class _JarvisScreenState extends State<JarvisScreen> with SingleTickerProviderStateMixin {
  Room? _room;
  EventsListener<RoomEvent>? _listener;
  bool _isConnected = false;
  bool _isConnecting = false;
  bool _isMicMuted = false;
  bool _isCameraEnabled = false;
  String _statusMessage = "Jarvis Standby";

  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _disconnect();
    super.dispose();
  }

  Future<void> _requestPermissions() async {
    await [Permission.microphone, Permission.camera].request();
  }

  Future<void> _connect() async {
    final sandboxId = dotenv.env['LIVEKIT_SANDBOX_ID'];
    final livekitUrl = dotenv.env['LIVEKIT_URL'] ?? 'wss://your-project.livekit.cloud';

    if (sandboxId == null || sandboxId.isEmpty || sandboxId.contains('your-sandbox-id')) {
      setState(() {
        _statusMessage = "Error: LIVEKIT_SANDBOX_ID not configured in assets/.env";
      });
      return;
    }

    setState(() {
      _isConnecting = true;
      _statusMessage = "Requesting token...";
    });

    try {
      await _requestPermissions();

      // Fetch token from LiveKit Cloud Sandbox
      final response = await http.get(
        Uri.parse('https://cloud-api.livekit.io/api/sandbox/connection-details'),
        headers: {'X-Sandbox-ID': sandboxId},
      );

      if (response.statusCode != 200) {
        throw Exception("Failed to fetch connection details from LiveKit Sandbox: ${response.body}");
      }

      final data = jsonDecode(response.body);
      final wsUrl = data['serverUrl'] ?? livekitUrl;
      final token = data['participantToken'];

      setState(() {
        _statusMessage = "Connecting to Jarvis room...";
      });

      final room = Room();
      final listener = room.createListener();

      await room.connect(wsUrl, token);
      await room.localParticipant?.setMicrophoneEnabled(true);

      setState(() {
        _room = room;
        _listener = listener;
        _isConnected = true;
        _isConnecting = false;
        _statusMessage = "Connected to Jarvis";
      });

      listener.on<RoomDisconnectedEvent>((event) {
        if (mounted) {
          setState(() {
            _isConnected = false;
            _statusMessage = "Disconnected";
          });
        }
      });
    } catch (e) {
      debugPrint("Error connecting to LiveKit: $e");
      if (mounted) {
        setState(() {
          _isConnecting = false;
          _statusMessage = "Connection failed: $e";
        });
      }
    }
  }

  Future<void> _disconnect() async {
    try {
      await _listener?.dispose();
      await _room?.disconnect();
      await _room?.dispose();
    } catch (e) {
      debugPrint("Disconnect error: $e");
    } finally {
      if (mounted) {
        setState(() {
          _room = null;
          _listener = null;
          _isConnected = false;
          _isConnecting = false;
          _statusMessage = "Jarvis Standby";
        });
      }
    }
  }

  void _toggleMic() async {
    if (_room?.localParticipant != null) {
      final newState = !_isMicMuted;
      await _room!.localParticipant!.setMicrophoneEnabled(!newState);
      setState(() {
        _isMicMuted = newState;
      });
    }
  }

  void _toggleCamera() async {
    if (_room?.localParticipant != null) {
      final newState = !_isCameraEnabled;
      await _room!.localParticipant!.setCameraEnabled(newState);
      setState(() {
        _isCameraEnabled = newState;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text(
          "J.A.R.V.I.S.",
          style: TextStyle(
            color: Color(0xFF00E5FF),
            fontWeight: FontWeight.bold,
            letterSpacing: 2.0,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Column(
          children: [
            const Spacer(),
            // Animated Glowing Arc Reactor
            Center(
              child: AnimatedBuilder(
                animation: _pulseController,
                builder: (context, child) {
                  final glow = _isConnected ? (_pulseController.value * 25 + 15) : 10.0;
                  return Container(
                    width: 220,
                    height: 220,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xFF121824),
                      border: Border.all(
                        color: _isConnected ? const Color(0xFF00E5FF) : Colors.cyan.withOpacity(0.3),
                        width: 2,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF00E5FF).withOpacity(_isConnected ? 0.6 : 0.2),
                          blurRadius: glow,
                          spreadRadius: glow / 4,
                        ),
                      ],
                    ),
                    child: Center(
                      child: Icon(
                        _isConnected ? Icons.mic : Icons.power_settings_new,
                        size: 72,
                        color: _isConnected ? const Color(0xFF00E5FF) : Colors.cyan.withOpacity(0.5),
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 30),
            // Status Text
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0),
              child: Text(
                _statusMessage,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white70,
                  fontSize: 16,
                  fontFamily: 'monospace',
                ),
              ),
            ),
            const Spacer(),
            // Action & Control Bar
            if (_isConnected) ...[
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32.0, vertical: 16.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    IconButton.filled(
                      onPressed: _toggleMic,
                      icon: Icon(_isMicMuted ? Icons.mic_off : Icons.mic),
                      style: IconButton.styleFrom(
                        backgroundColor: _isMicMuted ? Colors.red.withOpacity(0.3) : const Color(0xFF00E5FF),
                        foregroundColor: _isMicMuted ? Colors.red : Colors.black,
                        padding: const EdgeInsets.all(16),
                      ),
                    ),
                    IconButton.filled(
                      onPressed: _toggleCamera,
                      icon: Icon(_isCameraEnabled ? Icons.videocam : Icons.videocam_off),
                      style: IconButton.styleFrom(
                        backgroundColor: _isCameraEnabled ? const Color(0xFF00E5FF) : Colors.white12,
                        foregroundColor: _isCameraEnabled ? Colors.black : Colors.white,
                        padding: const EdgeInsets.all(16),
                      ),
                    ),
                    IconButton.filled(
                      onPressed: _disconnect,
                      icon: const Icon(Icons.call_end),
                      style: IconButton.styleFrom(
                        backgroundColor: Colors.redAccent,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.all(16),
                      ),
                    ),
                  ],
                ),
              ),
            ] else ...[
              Padding(
                padding: const EdgeInsets.all(32.0),
                child: SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: _isConnecting ? null : _connect,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF00E5FF),
                      foregroundColor: const Color(0xFF0B0E14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      elevation: 8,
                    ),
                    child: Text(
                      _isConnecting ? "INITIALIZING..." : "ENGAGE JARVIS",
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.5,
                        fontSize: 16,
                      ),
                    ),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}
