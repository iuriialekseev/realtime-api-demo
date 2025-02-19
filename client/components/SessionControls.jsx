import { useState } from "react";
import { Play, StopCircle } from "react-feather";
import Button from "./Button";

function SessionStopped({ startSession }) {
  const [isActivating, setIsActivating] = useState(false);

  function handleStartSession() {
    if (isActivating) return;

    setIsActivating(true);
    startSession();
  }

  return (
    <div className="flex items-center justify-center w-full h-full">
      <Button
        onClick={handleStartSession}
        className={isActivating ? "bg-sky-400" : "bg-sky-600"}
        icon={<Play height={16} />}
      >
        {isActivating ? "Starting..." : "Start"}
      </Button>
    </div>
  );
}

function SessionActive({ stopSession }) {
  return (
    <div className="flex items-center justify-center w-full h-full gap-4">
      <Button
        onClick={stopSession}
        className={"bg-red-600"}
        icon={<StopCircle height={16} />}
      >
        Disconnect
      </Button>
    </div>
  );
}

export default function SessionControls({
  startSession,
  stopSession,
  isSessionActive,
}) {
  return (
    <div className="flex gap-4 border-t-2 border-gray-200 h-full rounded-md">
      {isSessionActive ? (
        <SessionActive stopSession={stopSession} />
      ) : (
        <SessionStopped startSession={startSession} />
      )}
    </div>
  );
}
