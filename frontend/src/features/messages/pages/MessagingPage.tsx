import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import type {
  Message,
  TargetData,
  MessageContent,
} from "@/features/messages/types";
import type { Resident } from "@/features/residents/types";
import { TEMPLATES } from "@/config/constants";
import { filterResidentsByTarget } from "@/utils/helpers";
import { useResidents } from "@/features/residents/hooks/useResidentsApi";
import { useAppSelector } from "@/hooks";
import { selectCurrentCondominiumId } from "@/store/slices/condominiumSlice";
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

type Scope = "unit" | "floor" | "tower" | "all";
type MsgType = "text" | "template" | "image";

export function MessagingPage() {
  // Get current condominium ID
  const currentCondominiumId = useAppSelector(selectCurrentCondominiumId);
  
  // Fetch residents from API
  const { data: residents = [], isLoading, isError } = useResidents(
    currentCondominiumId || "",
    {}
  );
  const [scope, setScope] = useState<Scope>("unit");
  const [msgType, setMsgType] = useState<MsgType>("text");
  const [selectedTower, setSelectedTower] = useState("A");
  const [selectedFloor, setSelectedFloor] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [textContent, setTextContent] = useState("");
  const [templateId, setTemplateId] = useState(TEMPLATES[0]?.name || "");
  const [isSending, setIsSending] = useState(false);

  const recipientCount = useMemo(() => {
    if (!residents || residents.length === 0) return 0;
    
    const targetData: TargetData = {
      scope: scope.toUpperCase() as TargetData["scope"],
      tower: selectedTower,
      floor: selectedFloor,
      unit: selectedUnit,
    };
    const filtered = filterResidentsByTarget(residents, targetData);
    return filtered ? filtered.length : 0;
  }, [scope, selectedTower, selectedFloor, selectedUnit, residents]);

  const handleSend = async () => {
    if (!currentCondominiumId) {
      console.error("No condominium selected");
      return;
    }

    setIsSending(true);

    try {
      let content: MessageContent = {};
      if (msgType === "text") content = { text: textContent };
      if (msgType === "template")
        content = { templateName: templateId };
      if (msgType === "image")
        content = {
          mediaUrl: "http://exemplo.com/img.jpg",
          caption: textContent,
        };

      const targetData: TargetData = {
        scope: scope.toUpperCase() as TargetData["scope"],
        tower: selectedTower,
        floor: selectedFloor,
        unit: selectedUnit,
      };

      // TODO: Implementar envio via API
      console.log("Send message:", {
        condominiumId: currentCondominiumId,
        targetData,
        type: msgType.toUpperCase(),
        content,
      });

      // Simula envio
      await new Promise((resolve) => setTimeout(resolve, 500));

      setTextContent("");
      // Mostrar feedback de sucesso
    } catch (error) {
      console.error("Failed to send message:", error);
      // Mostrar feedback de erro
    } finally {
      setIsSending(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
  if (isError || !currentCondominiumId) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-6">
          <CardContent>
            <p className="text-muted-foreground">
              {!currentCondominiumId
                ? "Selecione um condomínio para enviar mensagens."
                : "Erro ao carregar a lista de moradores."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
