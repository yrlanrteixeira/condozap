import { useState } from 'react'
import { Send } from 'lucide-react'
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
import type { TargetData, MessageContent, Message } from '@/types'
import { TEMPLATES } from '@/data/mockData'
import { cn } from '@/lib/utils'

interface MessagingPanelProps {
  sendMessage: (targetData: TargetData, messageType: Message['type'], content: MessageContent) => void
}

type Scope = 'unit' | 'floor' | 'tower' | 'all'
type MsgType = 'text' | 'template' | 'image'

const SCOPE_OPTIONS: { value: Scope; label: string }[] = [
  { value: 'unit', label: 'Unidade Específica' },
  { value: 'floor', label: 'Andar Inteiro' },
  { value: 'tower', label: 'Torre Inteira' },
  { value: 'all', label: 'Todo o Condomínio' },
]

export function MessagingPanel({ sendMessage }: MessagingPanelProps) {
  const [scope, setScope] = useState<Scope>('unit')
  const [msgType, setMsgType] = useState<MsgType>('text')
  const [selectedTower, setSelectedTower] = useState('A')
  const [selectedFloor, setSelectedFloor] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('')
  const [textContent, setTextContent] = useState('')
  const [templateId, setTemplateId] = useState(TEMPLATES[0].name)

  const handleSend = () => {
    let content: MessageContent = {}
    if (msgType === 'text') content = { text: textContent }
    if (msgType === 'template') content = { templateName: templateId, components: [] }
    if (msgType === 'image')
      content = {
        mediaUrl: 'http://exemplo.com/img.jpg',
        caption: textContent,
      }

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
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4 sm:mb-6">Central de Disparo</h2>

      <Card>
        <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
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
            <label className="block text-sm font-medium text-foreground mb-2">
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
                className="min-h-[100px]"
                placeholder="Digite sua mensagem aqui..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
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
                <div className="bg-yellow-50 p-3 rounded text-sm text-yellow-800 border border-yellow-200">
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

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSend}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Send size={18} className="mr-2" />
              Enviar Mensagem
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
