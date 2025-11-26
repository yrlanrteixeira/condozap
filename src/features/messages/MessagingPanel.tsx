import { useState, useMemo } from 'react'
import { Send, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TargetData, MessageContent, Message, Resident } from '@/types'
import { TEMPLATES } from '@/data/mockData'
import { filterResidentsByTarget } from '@/utils/helpers'
import { cn } from '@/lib/utils'

interface MessagingPanelProps {
  sendMessage: (targetData: TargetData, messageType: Message['type'], content: MessageContent) => void
  residents: Resident[]
}

type Scope = 'unit' | 'floor' | 'tower' | 'all'
type MsgType = 'text' | 'template' | 'image'

const SCOPE_OPTIONS: { value: Scope; label: string }[] = [
  { value: 'unit', label: 'Unidade Específica' },
  { value: 'floor', label: 'Andar Inteiro' },
  { value: 'tower', label: 'Torre Inteira' },
  { value: 'all', label: 'Todo o Condomínio' },
]

export function MessagingPanel({ sendMessage, residents }: MessagingPanelProps) {
  const [scope, setScope] = useState<Scope>('unit')
  const [msgType, setMsgType] = useState<MsgType>('text')
  const [selectedTower, setSelectedTower] = useState('A')
  const [selectedFloor, setSelectedFloor] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('')
  const [textContent, setTextContent] = useState('')
  const [templateId, setTemplateId] = useState(TEMPLATES[0].name)
  const [isSending, setIsSending] = useState(false)

  const recipientCount = useMemo(() => {
    const targetData: TargetData = {
      scope,
      tower: selectedTower,
      floor: selectedFloor,
      unit: selectedUnit,
    }
    return filterResidentsByTarget(residents, targetData).length
  }, [scope, selectedTower, selectedFloor, selectedUnit])

  const handleSend = async () => {
    setIsSending(true)

    let content: MessageContent = {}
    if (msgType === 'text') content = { text: textContent }
    if (msgType === 'template') content = { templateName: templateId, components: [] }
    if (msgType === 'image')
      content = {
        mediaUrl: 'http://exemplo.com/img.jpg',
        caption: textContent,
      }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500))

    sendMessage(
      {
        scope,
        tower: selectedTower,
        floor: selectedFloor,
        unit: selectedUnit,
      },
      msgType,
      content
    )

    setIsSending(false)
    setTextContent('')
  }

  return (
    <div className="flex-1 flex items-start justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Enviar Mensagens
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Envie mensagens para moradores do condomínio
          </p>
        </div>

        <Card className="shadow-lg">
          <CardContent className="p-6 sm:p-8 space-y-6 sm:space-y-8">
            <div>
              <label htmlFor="scope-select" className="block text-sm font-medium text-foreground mb-2">
                1. Destinatário
              </label>
              <div className="flex flex-wrap gap-2 sm:gap-4 mb-4">
                {SCOPE_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={scope === option.value ? 'default' : 'outline'}
                    onClick={() => setScope(option.value)}
                    size="sm"
                    className="text-xs sm:text-sm"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {(scope === 'unit' || scope === 'floor' || scope === 'tower') && (
                  <Select value={selectedTower} onValueChange={setSelectedTower}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione Torre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">Torre A</SelectItem>
                      <SelectItem value="B">Torre B</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {(scope === 'unit' || scope === 'floor') && (
                  <Input
                    placeholder="Andar (ex: 1)"
                    value={selectedFloor}
                    onChange={(e) => setSelectedFloor(e.target.value)}
                  />
                )}
                {scope === 'unit' && (
                  <Input
                    placeholder="Unidade (ex: 101)"
                    value={selectedUnit}
                    onChange={(e) => setSelectedUnit(e.target.value)}
                  />
                )}
              </div>
            </div>

          <div className="border-t border-border pt-4">
            <label htmlFor="message-type" className="block text-sm font-medium text-foreground mb-2">
              2. Tipo de Mensagem
            </label>
            <div className="flex flex-wrap gap-2 sm:gap-4 mb-4">
              {(['text', 'template', 'image'] as MsgType[]).map((type) => (
                <Button
                  key={type}
                  variant={msgType === type ? 'default' : 'outline'}
                  onClick={() => setMsgType(type)}
                  size="sm"
                  className="text-xs sm:text-sm"
                >
                  {type === 'text' && 'Texto Livre'}
                  {type === 'template' && 'Template (Oficial)'}
                  {type === 'image' && 'Imagem/Vídeo'}
                </Button>
              ))}
            </div>

            {msgType === 'text' && (
              <Textarea
                id="message-text"
                className="min-h-[100px]"
                placeholder="Digite sua mensagem aqui..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                aria-label="Conteúdo da mensagem"
              />
            )}

            {msgType === 'template' && (
              <div className="space-y-3">
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATES.map((t) => (
                      <SelectItem key={t.name} value={t.name}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded text-sm text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">
                  Templates precisam ser pré-aprovados pela Meta. Esta é uma simulação.
                </div>
              </div>
            )}

            {msgType === 'image' && (
              <div className="space-y-3">
                <Input
                  placeholder="URL da Imagem (https://...)"
                  value="https://exemplo.com/aviso.jpg"
                  disabled
                />
                <Input
                  placeholder="Legenda (Opcional)"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users size={16} />
              <span>
                {recipientCount > 0 ? (
                  <>
                    <strong className="text-foreground">{recipientCount}</strong> {recipientCount === 1 ? 'morador receberá' : 'moradores receberão'} esta mensagem
                  </>
                ) : (
                  <span className="text-destructive">Nenhum destinatário encontrado</span>
                )}
              </span>
            </div>
            <Button
              onClick={handleSend}
              disabled={isSending || recipientCount === 0 || (msgType === 'text' && !textContent.trim())}
              className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto"
            >
              {isSending ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send size={18} className="mr-2" />
                  Enviar Mensagem
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
    </div>
  )
}
