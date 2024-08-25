import { atom, useAtomValue } from "jotai";
import { v4 } from "uuid";

type Word = {
  uuid: string;
  start: number;
  end: number;
  text: string;
};

const sentenceAtom = atom(
  [...Array(4000).keys()].map((i) =>
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
  return sentences.flatMap((s) => s);
});

const BUCKET_SIZE = 10;
const timeBucketAtom = atom((get) => {
  const words = get(wordsAtom);
  const maxTime = words[words.length - 1].end;

  const bucketCount = Math.ceil(words.length / BUCKET_SIZE);
  const timeInterval = Math.ceil(maxTime / bucketCount);

  const bucketIndexes = words.reduce(
    (acc, curr, i) => {
      const bucketIndex = Math.floor(curr.end / timeInterval);
      if (!acc[bucketIndex]) {
        acc[bucketIndex] = i;
      }
      return acc;
    },
    {} as Record<number, number>,
  );

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

const Timer = () => {
  const { timestamp } = useAtomValue(timestampAtom);

  return (
    <div>
      <div>Timestamp: {timestamp}</div>
    </div>
  );
};

const wordIndexAtom = atom((get) => {
  const words = get(wordsAtom);
  const { timestamp } = get(timestampAtom);
  const { bucketIndexes, timeInterval } = get(timeBucketAtom);

  const bucketIndex = Math.floor(timestamp / timeInterval);

  const searchStartIndex = bucketIndexes[bucketIndex] - 1 || 0;
  const searchEndIndex = (bucketIndexes[bucketIndex + 1] || words.length) + 1;

  const wordIndex = words
    .slice(searchStartIndex, searchEndIndex)
    .findIndex((word) => {
      return word.start <= timestamp && word.end >= timestamp;
    });
  if (wordIndex === -1) {
    return -1;
  }

  return wordIndex + searchStartIndex;
});

const Highlighter = () => {
  const words = useAtomValue(wordsAtom);
  const index = useAtomValue(wordIndexAtom);
  const word = document.getElementById(words[index]?.uuid);

  if (!word) {
    return null;
  }
  // Some easy padding to make it look a lil nicer
  const paddingHeight = 2;
  const paddingWidth = 3;
  const top = word.offsetTop - paddingHeight;
  const left = word.offsetLeft - paddingWidth;
  const width = word.offsetWidth + paddingWidth * 2;
  const height = word.offsetHeight + paddingHeight * 2;

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
