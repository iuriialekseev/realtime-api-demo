import { useEffect, useState } from "react";

const functionDescription = `
Call this function when the user mentioned a trigger. Can be called multiple times.
`;

const sessionUpdate = {
  type: "session.update",
  session: {
    tools: [
      {
        type: "function",
        name: "trigger_mentioned",
        description: functionDescription,
        parameters: {
          type: "object",
          strict: true,
          properties: {
            trigger: {
              type: "string",
              description: "The name of the trigger mentioned.",
            },
            description: {
              type: "string",
              description: "Explanation of the decision.",
            },
          },
          required: ["trigger", "description"],
        },
      },
    ],
    tool_choice: "auto",
  },
};

function FunctionCallOutput({ functionCallOutput }) {
  const { trigger, description } = JSON.parse(functionCallOutput.arguments);

  return (
    <div className="flex flex-col gap-2">
      <div className="w-full rounded-md flex flex-col gap-1 border border-gray-200 p-4">
        <p className="text-sm font-bold text-black">
          Trigger: <span className="text-blue-600">{trigger}</span>
        </p>
        <p className="text-xs text-gray-700">Description: {description}</p>
      </div>
    </div>
  );
}

export default function ToolPanel({
  isSessionActive,
  sendClientEvent,
  events,
  systemPrompt,
  setSystemPrompt,
  apiKey,
  setApiKey,
  voice,
  setVoice,
}) {
  const [functionAdded, setFunctionAdded] = useState(false);
  const [functionCallOutput, setFunctionCallOutput] = useState(null);

  useEffect(() => {
    if (!events || events.length === 0) return;

    const firstEvent = events[events.length - 1];
    if (!functionAdded && firstEvent.type === "session.created") {
      sendClientEvent(sessionUpdate);
      setFunctionAdded(true);
    }

    const mostRecentEvent = events[0];
    if (
      mostRecentEvent.type === "response.done" &&
      mostRecentEvent.response.output
    ) {
      mostRecentEvent.response.output.forEach((output) => {
        if (
          output.type === "function_call" &&
          output.name === "trigger_mentioned"
        ) {
          setFunctionCallOutput(output);
          setTimeout(() => {
            sendClientEvent({
              type: "response.create",
            });
          }, 500);
        }
      });
    }
  }, [events]);

  useEffect(() => {
    if (!isSessionActive) {
      setFunctionAdded(false);
      setFunctionCallOutput(null);
    }
  }, [isSessionActive]);

  return (
    <section className="h-full w-full flex flex-col gap-4">
      <div className="p-4 bg-gray-100 rounded-md">
        <label className="block text-sm font-bold text-gray-700 mb-1">
          API Key
        </label>
        <input
          type="text"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            localStorage.setItem("apiKey", e.target.value);
          }}
          className="w-full p-2 border border-gray-300 rounded-md mb-4"
          placeholder="Enter your OpenAI API key"
        />
        <label className="block text-sm font-bold text-gray-700 mb-1">
          System Prompt
        </label>
        <textarea
          type="text"
          value={systemPrompt}
          onChange={(e) => {
            setSystemPrompt(e.target.value);
            localStorage.setItem("systemPrompt", e.target.value);
          }}
          className="w-full p-2 border border-gray-300 rounded-md h-48 mb-4"
          placeholder={`[Describe the situation]

Triggers:
- [what was mentioned] [how to respond]
- [what was mentioned] [how to respond]
- [what was mentioned] [how to respond]

`}
        />
        <label className="block text-sm font-bold text-gray-700 mb-1">
          Voice
        </label>
        <select
          value={voice}
          onChange={(e) => {
            setVoice(e.target.value);
            localStorage.setItem("voice", e.target.value);
          }}
          className="w-full p-2 border border-gray-300 rounded-md mb-4"
        >
          <option value="alloy">Alloy</option>
          <option value="ash">Ash</option>
          <option value="ballad">Ballad</option>
          <option value="coral">Coral</option>
          <option value="echo">Echo</option>
          <option value="sage">Sage</option>
          <option value="shimmer">Shimmer</option>
          <option value="verse">Verse</option>
        </select>
      </div>
      <div className="h-full bg-gray-50 rounded-md p-4">
        <h2 className="text-lg font-bold">Detected triggers</h2>
        {isSessionActive ? (
          functionCallOutput ? (
            <FunctionCallOutput functionCallOutput={functionCallOutput} />
          ) : (
            <p>Awaiting trigger detection...</p>
          )
        ) : (
          <p>Awaiting...</p>
        )}
      </div>
    </section>
  );
}
