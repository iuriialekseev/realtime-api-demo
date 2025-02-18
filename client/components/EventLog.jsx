import { useState } from "react";

export default function EventLog({ events }) {
  // Filter for final user transcriptions and final AI transcriptions
  const transcripts = events
    .filter(
      (e) =>
        e.type === "conversation.item.input_audio_transcription.completed" ||
        e.type === "response.audio_transcript.done",
    )
    .map((e) => {
      const role =
        e.type === "conversation.item.input_audio_transcription.completed"
          ? "User"
          : "Assistant";
      const transcript = e.transcript || "";
      return { role, transcript, eventId: e.event_id };
    });

  return (
    <div className="flex flex-col gap-2 overflow-x-auto">
      {transcripts.length === 0 ? (
        <div className="text-gray-500">Awaiting...</div>
      ) : (
        transcripts.map((t, i) => (
          <div
            key={t.eventId || i}
            className="flex flex-col gap-2 p-2 rounded-md bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <strong>{t.role}:</strong>
            </div>
            <div className="text-gray-700 bg-gray-200 p-2 rounded-md">
              <pre className="text-xs whitespace-pre-wrap break-words">
                {t.transcript}
              </pre>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
