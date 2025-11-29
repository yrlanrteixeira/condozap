import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { TargetData, MessageContent, Message, Resident } from "@/types";
import { TEMPLATES } from "@/data/mockData";
import { filterResidentsByTarget } from "@/utils/helpers";
import {
  MessageHeader,
  MessageRecipientSelector,
  MessageTypeSelector,
  MessageTextInput,
  MessageTemplateSelector,
  MessageImageInput,
  MessageRecipientCount,
  MessageSendButton,
} from "../components";

interface MessagingPageProps {
  sendMessage: (
    targetData: TargetData,
    messageType: Message["type"],
    content: MessageContent
  ) => void;
  residents: Resident[];
}

type Scope = "unit" | "floor" | "tower" | "all";
type MsgType = "text" | "template" | "image";

export function MessagingPage({ sendMessage, residents }: MessagingPageProps) {
  const [scope, setScope] = useState<Scope>("unit");
  const [msgType, setMsgType] = useState<MsgType>("text");
  const [selectedTower, setSelectedTower] = useState("A");
  const [selectedFloor, setSelectedFloor] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [textContent, setTextContent] = useState("");
  const [templateId, setTemplateId] = useState(TEMPLATES[0]?.name || "");
  const [isSending, setIsSending] = useState(false);

  const recipientCount = useMemo(() => {
    const targetData: TargetData = {
      scope,
      tower: selectedTower,
      floor: selectedFloor,
      unit: selectedUnit,
    };
    return filterResidentsByTarget(residents, targetData).length;
  }, [scope, selectedTower, selectedFloor, selectedUnit, residents]);

  const handleSend = async () => {
    setIsSending(true);

    let content: MessageContent = {};
    if (msgType === "text") content = { text: textContent };
    if (msgType === "template")
      content = { templateName: templateId, components: [] };
    if (msgType === "image")
      content = {
        mediaUrl: "http://exemplo.com/img.jpg",
        caption: textContent,
      };

    await new Promise((resolve) => setTimeout(resolve, 500));

    sendMessage(
      {
        scope,
        tower: selectedTower,
        floor: selectedFloor,
        unit: selectedUnit,
      },
      msgType,
      content
    );

    setIsSending(false);
    setTextContent("");
  };

  return (
    <div className="flex-1 flex items-start justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-3xl">
        <MessageHeader />

        <Card className="shadow-lg">
          <CardContent className="p-6 sm:p-8 space-y-6 sm:space-y-8">
            <MessageRecipientSelector
              scope={scope}
              onScopeChange={setScope}
              selectedTower={selectedTower}
              onTowerChange={setSelectedTower}
              selectedFloor={selectedFloor}
              onFloorChange={setSelectedFloor}
              selectedUnit={selectedUnit}
              onUnitChange={setSelectedUnit}
            />

            <MessageTypeSelector msgType={msgType} onTypeChange={setMsgType} />

            {msgType === "text" && (
              <MessageTextInput value={textContent} onChange={setTextContent} />
            )}

            {msgType === "template" && (
              <MessageTemplateSelector
                templateId={templateId}
                onTemplateChange={setTemplateId}
              />
            )}

            {msgType === "image" && (
              <MessageImageInput
                caption={textContent}
                onCaptionChange={setTextContent}
              />
            )}

            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-border">
              <MessageRecipientCount count={recipientCount} />
              <MessageSendButton
                onClick={handleSend}
                disabled={
                  isSending ||
                  recipientCount === 0 ||
                  (msgType === "text" && !textContent.trim())
                }
                isSending={isSending}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default MessagingPage;
