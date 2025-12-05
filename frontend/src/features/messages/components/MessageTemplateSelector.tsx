import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TEMPLATES } from '@/config/constants';

interface MessageTemplateSelectorProps {
  templateId: string;
  onTemplateChange: (templateId: string) => void;
}

export const MessageTemplateSelector = ({
  templateId,
  onTemplateChange,
}: MessageTemplateSelectorProps) => {
  return (
    <div className="space-y-3">
      <Select value={templateId} onValueChange={onTemplateChange}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione um template" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="" disabled hidden>
            Selecione um template
          </SelectItem>
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
  );
};

