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

// `activeFileId` needs to be in sync between local storage and indexeddb.
// For this to happen we need some initial async checks to run.
// The idea is to spin these checks as soon as possible when the app loads initially.
// Then until we resolve the checks we should show a loading state in the component.
const activeFileId = useActiveFileId.getState().activeFileId;
if (!isValidFileId(activeFileId)) {
  // If there is no active file id, we first check if indeed there are no files in the db.
  // If there are then we should grab the first one from there and set that as the active file id.
  db.getFirstFile().then((file) => {
    console.log("file", file);
    if (file) {
      useActiveFileId.setState((prev) => ({ ...prev, activeFileId: file.id }));
    } else {
      // If there are no files in the db then we can create a new file
      db.createFile().then((fileId) => {
        useActiveFileId.setState((prev) => ({ ...prev, activeFileId: fileId }));
      });
    }
  });
} else {
  // If we have a valid file id then we should check if also the file exists in the db just to be sure.
  db.getFile(activeFileId).then((file) => {
    if (!file) {
      // If no file then we just create a new one and set the active file id to that.
      db.createFile().then((fileId) => {
        useActiveFileId.setState((prev) => ({ ...prev, activeFileId: fileId }));
      });
    }
    // If a file exists then we don't need to do anything. useLiveQuery() will take care of fetching the file content.
  });
}

function Body() {
  const { activeFileId } = useActiveFileId();
  const fileContents = useLiveQuery(() => db.getFile(activeFileId), [activeFileId]);
  const [loadingFile, setLoadingFile] = useState(isValidFileId(activeFileId) || !fileContents);
  const [md, setMd] = useState({
    content: "",
    // TODO: `shouldSave` is a little misleading. It's used to prevent initial overwriting when we haven't gotten any file content yet.
    shouldSave: false, 
  });
  console.log(fileContents);

  useEffect(() => {
    if (isValidFileId(activeFileId) && fileContents) {
      setLoadingFile(false);
      setMd({ content: fileContents.content, shouldSave: true });
    }
  }, [activeFileId, fileContents]);

  const onMdChange = (val: string) => setMd({ content: val, shouldSave: true });

  useDebouncedEffect(
    async () => {
      if (md.shouldSave) {
        await db.updateFileContent(activeFileId, md.content);
      }
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
          value={md.content}
          autoFocus
          onChange={onMdChange}
          extensions={codeMirrorExtensions}
          basicSetup={codeMirrorSetup}
        />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={50} minSize={15} className="h-[calc(100svh-4rem)]">
        <MarkdownPreview className="h-full overflow-auto px-8 py-4 text-base" source={md.content} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
