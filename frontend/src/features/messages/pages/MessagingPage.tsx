import { useState, useMemo } from "react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { FormSkeleton, PageHeaderSkeleton } from "@/shared/components/ui/skeleton";
import { useToast } from "@/shared/components/ui/use-toast";
import type { TargetData, MessageType, MessageScope } from "@/features/messages/types";
import { TEMPLATES } from "@/config/constants";
import { filterResidentsByTarget } from "@/shared/utils/helpers";
import { useResidents } from "@/features/residents/hooks/useResidentsApi";
import { useSendMessage } from "../hooks/useMessagesApi";
import { useAppSelector } from "@/shared/hooks";
import { useAuth } from "@/shared/hooks/useAuth";
import { selectCurrentCondominiumId } from "@/shared/store/slices/condominiumSlice";
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
  // Get current condominium ID and user
  const currentCondominiumId = useAppSelector(selectCurrentCondominiumId);
  const { user } = useAuth();
  const { toast } = useToast();

  // SUPER_ADMIN vê todos os moradores, outros veem apenas do condomínio selecionado
  const condoIdToFetch = currentCondominiumId || '';

  // Fetch residents from API
  const {
    data: residents = [],
    isLoading,
    isError,
  } = useResidents(condoIdToFetch, {});

  // Send message mutation
  const sendMessage = useSendMessage();

  const [scope, setScope] = useState<Scope>("unit");
  const [msgType, setMsgType] = useState<MsgType>("text");
  const [selectedTower, setSelectedTower] = useState("A");
  const [selectedFloor, setSelectedFloor] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [textContent, setTextContent] = useState("");
  const [templateId, setTemplateId] = useState(TEMPLATES[0]?.name || "");
  const isSending = sendMessage.isPending;

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
      toast({
        title: "Erro",
        description: "Nenhum condomínio selecionado.",
        variant: "error",
        duration: 3000,
      });
      return;
    }

    // Validation
    if (msgType === "text" && !textContent.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Digite uma mensagem antes de enviar.",
        variant: "warning",
        duration: 3000,
      });
      return;
    }

    if (msgType === "template" && !templateId) {
      toast({
        title: "Template não selecionado",
        description: "Selecione um template antes de enviar.",
        variant: "warning",
        duration: 3000,
      });
      return;
    }

    try {
      // Prepare content based on message type
      let contentString = "";
      if (msgType === "text") {
        contentString = textContent;
      } else if (msgType === "template") {
        contentString = templateId;
      } else if (msgType === "image") {
        contentString = textContent; // Caption for image
      }

      await sendMessage.mutateAsync({
        condominiumId: currentCondominiumId,
        type: msgType.toUpperCase() as MessageType,
        content: {
          text: contentString,
        },
        target: {
          scope: scope.toUpperCase() as MessageScope,
          tower: selectedTower,
          floor: selectedFloor,
          unit: selectedUnit,
        },
        sentBy: user?.id || "",
      });

      toast({
        title: "Mensagem enviada!",
        description: `Mensagem enviada para ${recipientCount} morador${recipientCount !== 1 ? "es" : ""} com sucesso.`,
        variant: "success",
        duration: 3000,
      });

      // Reset form
      setTextContent("");
      if (msgType === "template") {
        setTemplateId(TEMPLATES[0]?.name || "");
      }
    } catch {
      toast({
        title: "Erro ao enviar",
        description: "Não foi possível enviar a mensagem. Tente novamente.",
        variant: "error",
        duration: 5000,
      });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex items-start justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-3xl space-y-6">
          <PageHeaderSkeleton />
          <Card className="shadow-lg">
            <CardContent className="p-6 sm:p-8">
              <FormSkeleton />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state - SUPER_ADMIN pode acessar sem condomínio selecionado (vê todos)
  if (isError || (!currentCondominiumId && user?.role !== "SUPER_ADMIN")) {
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
    <div className="flex-1 flex items-start justify-center p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="w-full max-w-3xl">
        <MessageHeader />

        <Card className="shadow-lg">
          <CardContent className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 md:space-y-8">
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
