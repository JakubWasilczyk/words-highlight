import { atom, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useState } from "react";
import { v4 } from "uuid";

type Word = {
  uuid: string;
  start: number;
  end: number;
  text: string;
};

const sentenceAtom = atom(
  [...Array(2000).keys()].map((i) =>
    [...Array(40).keys()].map((j) => {
      return {
        uuid: v4(),
        start: (40 * i + j) / 4,
        end: (40 * i + j + 1) / 4,
        text: j.toString().padStart(Math.random() * 7, "0"),
      };
    }),
  ),
);
const wordsAtom = atom<Word[]>((get) => {
  const sentences = get(sentenceAtom);
  const words = sentences.flatMap((s) => s);
  return words;
});

const BUCKET_SIZE = 10;
const timeBucketAtom = atom((get) => {
  const words = get(wordsAtom);
  const maxTime = words[words.length - 1].end;

  const bucketCount = Math.ceil(words.length / BUCKET_SIZE);
  const timeInterval = Math.ceil(maxTime / bucketCount);

  const bucketIndexes = words.reduce((acc, curr, i) => {
    const bucketIndex = Math.floor(curr.start / timeInterval);
    if (!acc.get(bucketIndex)) {
      acc.set(bucketIndex, i);
    }
    return acc;
  }, new Map<number, number>());

  return {
    bucketIndexes,
    timeInterval,
  };
});

type Timestamp = {
  timestamp: number;
  start: number;
};
const timestampAtom = atom<Timestamp>({
  timestamp: 0,
  start: new Date().getTime(),
});
timestampAtom.onMount = (set) => {
  const interval = setInterval(() => {
    set(({ start }) => ({
      timestamp: (new Date().getTime() - start) / 1000,
      start,
    }));
  }, 15);
  return () => {
    clearInterval(interval);
  };
};

const useResetTimer = () => {
  const setTimestamp = useSetAtom(timestampAtom);
  const setCurrentWord = useSetAtom(currentWordAtom);
  return () => {
    setTimestamp((prev) => ({ ...prev, start: new Date().getTime() }));
    setCurrentWord(null);
  };
};

const Timer = () => {
  const { timestamp } = useAtomValue(timestampAtom);
  const resetTimer = useResetTimer();

  return (
    <div className="flex justify-between border-gray-600 border-b pb-2 mb-4 items-center">
      <div>Timestamp: {timestamp}</div>
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded"
        onClick={() => {
          resetTimer();
        }}
      >
        Reset
      </button>
    </div>
  );
};

// Dont derive this atom, it is used for caching
const currentWordAtom = atom<Word | null>(null);

const wordIndexAtom = atom((get) => {
  const words = get(wordsAtom);
  const currentWord = get(currentWordAtom);
  const { timestamp } = get(timestampAtom);
  const { bucketIndexes, timeInterval } = get(timeBucketAtom);

  if ((currentWord?.end || 0) >= timestamp) return null;

  const bucketIndex = Math.floor(timestamp / timeInterval);

  const bucketStartIndex = bucketIndexes.get(bucketIndex);
  if (!bucketStartIndex) return null;

  const searchStartIndex = bucketStartIndex - 1 || 0;

  const wordIndex = words.slice(searchStartIndex).findIndex((word) => {
    return word.start <= timestamp && word.end >= timestamp;
  });
  if (wordIndex === -1) {
    return null;
  }

  return wordIndex + searchStartIndex;
});

const Highlighter = () => {
  const words = useAtomValue(wordsAtom);
  const index = useAtomValue(wordIndexAtom);
  const setWord = useSetAtom(currentWordAtom);

  // Caching with react useEffect, jotai-effect would be cleaner
  const [previousIndex, setPreviousIndex] = useState(-1);
  useEffect(() => {
    if (index === null) {
      return;
    }
    if (index !== previousIndex) {
      setPreviousIndex(index);
    }
  }, [index, previousIndex]);

  useEffect(() => {
    if (index === null) {
      return;
    }
    if (index === previousIndex) {
      return;
    }
    setWord(words[index]);
  }, [index, previousIndex, words]);

  const wordElement = document.getElementById(
    words[index ?? previousIndex]?.uuid || "",
  );

  if (!wordElement) {
    return null;
  }

  // Some easy padding to make it look a lil nicer
  const paddingHeight = 2;
  const paddingWidth = 3;
  const top = wordElement.offsetTop - paddingHeight;
  const left = wordElement.offsetLeft - paddingWidth;
  const width = wordElement.offsetWidth + paddingWidth * 2;
  const height = wordElement.offsetHeight + paddingHeight * 2;

  return (
    <div
      className="absolute z-10 ease-out transition-all backdrop-invert duration-200 bg-indigo-300/50 rounded-lg"
      style={{ top, left, width, height }}
    ></div>
  );
};

function App() {
  const sentence = useAtomValue(sentenceAtom);
  return (
    <main className="container mx-auto py-4">
      <Timer />
      <section className="relative">
        {sentence.map((s, id) => (
          <SentenceComponent key={id} sentence={s} />
        ))}
        <Highlighter />
      </section>
    </main>
  );
}
export default App;

function SentenceComponent({ sentence }: { sentence: Word[] }) {
  return (
    <div className="space-x-2 flex flex-wrap">
      {sentence.map((w) => (
        <WordComponent id={w.uuid} key={w.uuid} word={w} />
      ))}
    </div>
  );
}

function WordComponent({ word, id }: { word: Word; id: string }) {
  return <span id={id}>{word.text}</span>;
}
