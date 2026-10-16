import { useState } from 'react';
import { IconBrandTypescript } from '@tabler/icons-react';
import { Modal } from '../../components/modal';
import { CodeBlock } from '../../components/rare-ui/code-block';

export function ParameterTypeScriptPreview({
  title,
  generate,
}: {
  title: string;
  generate: () => string;
}) {
  const [source, setSource] = useState('');
  return (
    <>
      <button
        className="parameter-typescript__trigger"
        type="button"
        title={`生成${title} TypeScript`}
        aria-label={`生成${title} TypeScript`}
        aria-haspopup="dialog"
        onClick={() => setSource(generate())}
      >
        <IconBrandTypescript size={18} stroke={1.7} aria-hidden="true" />
      </button>
      <Modal
        open={Boolean(source)}
        onClose={() => setSource('')}
        title={`${title} TypeScript`}
        size="large"
        bodyClassName="parameter-typescript__body"
      >
        <CodeBlock
          code={source}
          language="typescript"
          filename={`${title}.ts`}
          accent="#4f46e5"
          className="parameter-typescript__code"
        />
      </Modal>
    </>
  );
}
