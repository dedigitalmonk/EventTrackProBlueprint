import { useState } from "react";
import { FormField } from "@shared/schema";

export function useFormBuilder(initialFields: FormField[] = []) {
  const [fields, setFields] = useState<FormField[]>(initialFields);

  const addField = (field: FormField) => {
    setFields([...fields, field]);
  };

  const updateField = (id: string, updatedField: Partial<FormField>) => {
    setFields(
      fields.map((field) => 
        field.id === id ? { ...field, ...updatedField } : field
      )
    );
  };

  const removeField = (id: string) => {
    setFields(fields.filter((field) => field.id !== id));
  };

  const reorderFields = (fromIndex: number, toIndex: number) => {
    const result = [...fields];
    const [removed] = result.splice(fromIndex, 1);
    result.splice(toIndex, 0, removed);
    setFields(result);
  };

  return {
    fields,
    addField,
    updateField,
    removeField,
    reorderFields,
    setFields,
  };
}
