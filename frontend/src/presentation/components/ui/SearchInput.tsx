import { Search } from 'lucide-react';
import { Input, InputWrapper } from './input.js';

export function SearchInput({
  value,
  onChange,
  label,
  placeholder = 'Search…',
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
}) {
  return (
    <InputWrapper variant="sm" className="w-52">
      <Search className="text-muted-foreground ms-2 size-3.5" aria-hidden />
      <Input
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={label}
        onChange={(e) => {
          onChange(e.target.value);
        }}
      />
    </InputWrapper>
  );
}
