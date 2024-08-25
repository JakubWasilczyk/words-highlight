import { useEffect, useMemo, useState } from "react";

type Word = {
  start: number;
  end: number;
  text: string;
};

function getSentence(): Word[][] {
  return [...Array(1000).keys()].map((i) =>
    [...Array(20).keys()].map((j) => {
      return {
        start: (20 * i + j) / 4,
        end: (20 * i + j + 1) / 4,
        text: j.toString().padStart(4, "0"),
      };
    }),
  );
}

function App() {
  const sentence = useMemo(() => getSentence(), []);

  return (
    <main className="container mx-auto py-4">
      <section className="relative">
        {sentence.map((s, id) => (
          <SentenceComponent
            key={`sentence-${id}`}
            sentenceId={`${id}`}
            sentence={s}
          />
        ))}
        <Cursor data={sentence} />
      </section>
    </main>
  );
}
export default App;

function SentenceComponent({
  sentenceId,
  sentence,
}: {
  sentenceId: string;
  sentence: Word[];
}) {
  return (
    <div className="space-x-2">
      {sentence.map((w, wordId) => (
        <WordComponent
          id={`sentence-${sentenceId}-word-${wordId}`}
          key={`sentence-${sentenceId}-word-${wordId}`}
          word={w}
        />
      ))}
    </div>
  );
}

function WordComponent({ word, id }: { word: Word; id: string }) {
  return <span id={id}>{word.text}</span>;
}

// This is where the magic happens. It is just a background that will jump from word to word
// This is the only thing that gets rerendered whenever timestamp changes.
function Cursor({ data }: { data: Word[][] }) {
  const [sentenceId, setSentenceId] = useState(0);
  const [wordId, setWordId] = useState(0);

  // This is just an example to see the effect itself
  // here probably the best thing would be a monitor of current timestamp and hashmap that finds the correct word
  // the hashmap key could be the word's DOM ID to make it easier to find
  useEffect(() => {
    const interval = setInterval(() => {
      const newWordId = wordId + 1;
      // Check if next the sentence
      if (newWordId == data[sentenceId].length) {
        setWordId(0);
        setSentenceId(sentenceId + 1);
        return;
      }
      // Just go to next word same sentence
      setWordId(newWordId);
    }, 1000);
    return () => clearInterval(interval);
  }, [wordId, sentenceId, data]);

  const word = document.getElementById(`sentence-${sentenceId}-word-${wordId}`);
  if (!word) return <></>; // Word not found, possible bad id

  // Some easy padding to make it look a lil nicer
  const paddingHeight = 2;
  const paddingWidth = 3;
  const top = word.offsetTop - paddingHeight;
  const left = word.offsetLeft - paddingWidth;
  const width = word.offsetWidth + paddingWidth * 2;
  const height = word.offsetHeight + paddingHeight * 2;
  return (
    <div
      className="absolute z-10 ease-out transition-all backdrop-invert duration-500 bg-indigo-300/50 rounded-lg"
      style={{ top, left, width, height }}
    ></div>
  );
}
