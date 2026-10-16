import type { ComponentProps } from 'react';

type InputProps = ComponentProps<'input'> & { variant?: 'default' | 'embedded' | 'code' };
type TextareaProps = ComponentProps<'textarea'> & { variant?: 'default' | 'code' };

/**
 * Applies the global parameter input appearance while preserving native events and refs.
 * @param props Native input attributes and an optional compound-control or code variant.
 * @returns A native input with shared hover, focus, disabled, read-only and invalid states.
 */
export function Input({ className = '', variant = 'default', ...props }: InputProps) {
  return <input {...props} className={`ui-input ui-input--${variant} ${className}`.trim()} />;
}

/**
 * Shares input states with multiline fields while allowing code editors to retain their layout.
 * @param props Native textarea attributes and an optional code-editor variant.
 * @returns A native textarea preserving selection, composition, scrolling and ref behavior.
 */
export function Textarea({ className = '', variant = 'default', ...props }: TextareaProps) {
  return (
    <textarea
      {...props}
      className={`ui-input ui-textarea ui-input--${variant} ${className}`.trim()}
    />
  );
}
