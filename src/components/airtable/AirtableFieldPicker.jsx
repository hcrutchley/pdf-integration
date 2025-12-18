import React, { useState, useMemo } from 'react';
import { Search, Check, Type, Hash, Calendar, CheckSquare, Link2, FileText, User, Mail, Phone, Image, Paperclip } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const getFieldIcon = (type) => {
  const iconMap = {
    'singleLineText': Type,
    'multilineText': FileText,
    'number': Hash,
    'date': Calendar,
    'checkbox': CheckSquare,
    'singleSelect': Type,
    'multipleSelects': Type,
    'url': Link2,
    'email': Mail,
    'phoneNumber': Phone,
    'attachment': Paperclip,
    'formula': Hash,
    'rollup': Hash,
    'count': Hash,
    'lookup': Type,
    'multipleRecordLinks': Link2,
    'singleCollaborator': User,
    'multipleCollaborators': User,
    'barcode': Hash,
    'rating': Hash,
    'duration': Hash,
    'lastModifiedTime': Calendar,
    'createdTime': Calendar,
    'autoNumber': Hash,
    'currency': Hash,
    'percent': Hash
  };
  const Icon = iconMap[type] || Type;
  return <Icon className="h-3.5 w-3.5" />;
};

export default function AirtableFieldPicker({ 
  fields = [], 
  value, 
  onChange,
  placeholder = "Select field..." 
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredFields = useMemo(() => {
    if (!search) return fields;
    const lower = search.toLowerCase();
    return fields.filter(field => 
      field.name.toLowerCase().includes(lower) ||
      field.type.toLowerCase().includes(lower)
    );
  }, [fields, search]);

  const selectedField = fields.find(f => f.name === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="truncate flex items-center gap-2">
            {selectedField ? (
              <>
                <span className="text-slate-500">
                  {getFieldIcon(selectedField.type)}
                </span>
                <span>
                  {selectedField.name}
                  <span className="text-slate-400 ml-2 text-xs">
                    ({selectedField.type})
                  </span>
                </span>
              </>
            ) : (
              placeholder
            )}
          </span>
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput 
            placeholder="Search fields..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandEmpty>No field found.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {filteredFields.map((field) => (
              <CommandItem
                key={field.id}
                value={field.name}
                onSelect={() => {
                  onChange(field.name);
                  setOpen(false);
                }}
              >
                <Check
                  className={`mr-2 h-4 w-4 ${
                    value === field.name ? 'opacity-100' : 'opacity-0'
                  }`}
                />
                <span className="mr-2 text-slate-500">
                  {getFieldIcon(field.type)}
                </span>
                <div className="flex-1">
                  <div className="font-medium">{field.name}</div>
                  <div className="text-xs text-slate-500">{field.type}</div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}