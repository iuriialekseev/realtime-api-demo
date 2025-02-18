import { useEffect, useRef, useState } from "react";
import EventLog from "./EventLog";
import SessionControls from "./SessionControls";
import ToolPanel from "./ToolPanel";

export default function App() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [events, setEvents] = useState([]);
  const [dataChannel, setDataChannel] = useState(null);
  const [systemPrompt, setSystemPrompt] = useState(
    localStorage.getItem("systemPrompt") || ""
  );
  const [apiKey, setApiKey] = useState(localStorage.getItem("apiKey") || "");
  const [voice, setVoice] = useState(localStorage.getItem("voice") || "ash");
  const peerConnection = useRef(null);
  const audioElement = useRef(null);

  async function startSession() {
    if (!apiKey) {
      console.error("No API key provided");
      return;
    }

    localStorage.setItem("apiKey", apiKey);

    let ephemeralData;
    try {
      const ephemeralKeyResponse = await fetch(
        "https://api.openai.com/v1/realtime/sessions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-realtime-preview-2024-12-17",
            input_audio_transcription: {
              model: "whisper-1",
            },
            voice: voice,
          }),
        },
      );

      ephemeralData = await ephemeralKeyResponse.json();
    } catch (error) {
      console.error("Failed to fetch ephemeral key:", error);
      return;
    }

    const EPHEMERAL_KEY = ephemeralData?.client_secret?.value;
    if (!EPHEMERAL_KEY) {
      console.error("Invalid ephemeral key response:", ephemeralData);
      return;
    }

    const pc = new RTCPeerConnection();

    audioElement.current = document.createElement("audio");
    audioElement.current.autoplay = true;
    pc.ontrack = (e) => (audioElement.current.srcObject = e.streams[0]);

    const ms = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    pc.addTrack(ms.getTracks()[0]);

    const dc = pc.createDataChannel("oai-events");
    setDataChannel(dc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const baseUrl = "https://api.openai.com/v1/realtime";
    const model = "gpt-4o-realtime-preview-2024-12-17";
    let answer;
    try {
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp",
        },
      });

      answer = {
        type: "answer",
        sdp: await sdpResponse.text(),
      };
    } catch (error) {
      console.error("Failed to fetch answer SDP:", error);
      return;
    }

    try {
      await pc.setRemoteDescription(answer);
    } catch (error) {
      console.error("Failed to set remote SDP:", error);
      return;
    }

    peerConnection.current = pc;
  }

  function stopSession() {
    if (dataChannel) {
      dataChannel.close();
    }

    if (peerConnection.current) {
      peerConnection.current.getSenders().forEach((sender) => {
        if (sender.track) {
          sender.track.stop();
        }
      });
      peerConnection.current.close();
    }

    setIsSessionActive(false);
    setDataChannel(null);
    peerConnection.current = null;
  }

  function sendClientEvent(message) {
    if (dataChannel) {
      message.event_id = message.event_id || crypto.randomUUID();
      dataChannel.send(JSON.stringify(message));
      setEvents((prev) => [message, ...prev]);
    } else {
      console.error("Failed to send message - no data channel available", message);
    }
  }

  useEffect(() => {
    if (dataChannel) {
      const handleMessage = (e) => {
        setEvents((prev) => [JSON.parse(e.data), ...prev]);
      };

      const handleOpen = () => {
        setIsSessionActive(true);
        setEvents([]);
        if (systemPrompt.trim()) {
          dataChannel.send(
            JSON.stringify({
              type: "session.update",
              session: {
                instructions: systemPrompt.trim(),
              },
            }),
          );
        }
      };

      dataChannel.addEventListener("message", handleMessage);
      dataChannel.addEventListener("open", handleOpen);

      return () => {
        dataChannel.removeEventListener("message", handleMessage);
        dataChannel.removeEventListener("open", handleOpen);
      };
    }
  }, [dataChannel, systemPrompt]);

  return (
    <>
      <nav className="absolute top-0 left-0 right-0 h-16 flex items-center">
        <div className="flex items-center gap-4 w-full m-4 pb-2 border-0 border-b border-solid border-gray-200">
          <h1>Conversation trainer</h1>
        </div>
      </nav>
      <main className="absolute top-16 left-0 right-0 bottom-0">
        {/* Left Sidebar: ToolPanel */}
        <section className="absolute top-0 w-[380px] left-0 bottom-0 p-4 pt-0 overflow-y-auto">
          <ToolPanel
            isSessionActive={isSessionActive}
            sendClientEvent={sendClientEvent}
            events={events}
            systemPrompt={systemPrompt}
            setSystemPrompt={setSystemPrompt}
            apiKey={apiKey}
            setApiKey={setApiKey}
            voice={voice}
            setVoice={setVoice}
          />
        </section>
        {/* Right Main Chat Window */}
        <section className="absolute top-0 left-[380px] right-0 bottom-0 flex flex-col">
          <section className="flex-1 px-4 overflow-y-auto">
            <EventLog events={events} />
          </section>
          <section className="h-32 p-4">
            <SessionControls
              startSession={startSession}
              stopSession={stopSession}
              sendClientEvent={sendClientEvent}
              isSessionActive={isSessionActive}
            />
          </section>
        </section>
      </main>
    </>
  );

}
