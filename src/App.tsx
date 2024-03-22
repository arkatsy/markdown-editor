import { ComponentProps, useEffect, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import MarkdownPreview from "@uiw/react-markdown-preview";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "./components/ui/resizable";
import { githubDark } from "@uiw/codemirror-theme-github";
import { db } from "./db";
import { useDebouncedEffect } from "./use-debounced-effect";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useLiveQuery } from "dexie-react-hooks";

export default function App() {
  return (
    <div>
      <Header />
      <Body />
    </div>
  );
}

function Header() {
  return (
    <header className="flex min-h-16 items-center px-4">
      <h2 className="text-xl font-semibold tracking-widest">MARKDOWN</h2>
    </header>
  );
}

const NO_FILE_ID = -1;
const STORAGE_FILE_ID_KEY = "active-file-id";
const SAVE_ON_CHANGE_DELAY = 450;
const isValidFileId = (id: number) => id > NO_FILE_ID;
// prettier-ignore
const editorHeight = window.innerHeight - (parseInt(getComputedStyle(document.documentElement).fontSize) * 4); // NOTE: 4 is because of min-h-16 (4rem)

const useActiveFileId = create<{
  activeFileId: number;
  setActiveFileId: (id: number) => void;
}>()(
  persist(
    (set) => ({
      activeFileId: NO_FILE_ID,
      setActiveFileId: (id) => set({ activeFileId: id }),
    }),
    { name: STORAGE_FILE_ID_KEY },
  ),
);

const codeMirrorSetup: ComponentProps<typeof CodeMirror>["basicSetup"] = {
  foldGutter: false,
  lineNumbers: false,
};

const codeMirrorExtensions: ComponentProps<typeof CodeMirror>["extensions"] = [markdown()];

const activeFileId = useActiveFileId.getState().activeFileId;

if (activeFileId === NO_FILE_ID) {
  db.createFile().then((fileId) => {
    useActiveFileId.setState((prev) => ({ ...prev, activeFileId: fileId }));
  });
}

function Body() {
  const [md, setMd] = useState("");
  const { activeFileId } = useActiveFileId();
  const fileContents = useLiveQuery(() => db.files.get(activeFileId), [activeFileId]);
  const [loadingFile, setLoadingFile] = useState(isValidFileId(activeFileId) || !fileContents);

  useEffect(() => {
    if (isValidFileId(activeFileId) && fileContents) {
      setLoadingFile(false);
    }
  }, [activeFileId, fileContents]);

  const onMdChange = (val: string) => setMd(val);

  useDebouncedEffect(
    async () => {
      await db.updateFileContent(activeFileId, md);
    },
    [md],
    SAVE_ON_CHANGE_DELAY,
  );

  if (loadingFile) return <div>Loading...</div>;

  return (
    <ResizablePanelGroup direction="horizontal" autoSaveId="resizer-save">
      <ResizablePanel defaultSize={50} minSize={15} className="h-[calc(100svh-4rem)]">
        <CodeMirror
          className="bg-github-950 p-4 text-base"
          height={`${editorHeight}px`}
          maxHeight={`${editorHeight}px`}
          theme={githubDark}
          value={md}
          autoFocus
          onChange={onMdChange}
          extensions={codeMirrorExtensions}
          basicSetup={codeMirrorSetup}
        />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={50} minSize={15} className="h-[calc(100svh-4rem)]">
        <MarkdownPreview className="h-full overflow-auto px-8 py-4 text-base" source={md} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
