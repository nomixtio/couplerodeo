export interface GifOption {
  id: string;
  label: string;
  url: string;
}

export const GIF_OPTIONS: GifOption[] = [
  {
    id: "heart",
    label: "Love",
    url: "https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif",
  },
  {
    id: "hug",
    label: "Hug",
    url: "https://media.giphy.com/media/14uQ3cOFteDaU/giphy.gif",
  },
  {
    id: "kiss",
    label: "Kiss",
    url: "https://media.giphy.com/media/3o7abKhqSpl8PhCoYo/giphy.gif",
  },
  {
    id: "happy",
    label: "Happy",
    url: "https://media.giphy.com/media/5GoVLcwAOxlRu/giphy.gif",
  },
  {
    id: "excited",
    label: "Excited",
    url: "https://media.giphy.com/media/5VKbvrjphotoTGiDu/giphy.gif",
  },
  {
    id: "thinking",
    label: "Thinking",
    url: "https://media.giphy.com/media/3o7TKoWXEH3JOKlKSY/giphy.gif",
  },
  {
    id: "laugh",
    label: "Laugh",
    url: "https://media.giphy.com/media/13CoXDiaCcGyqI/giphy.gif",
  },
  {
    id: "wow",
    label: "Wow",
    url: "https://media.giphy.com/media/5VKbvrjphotoTGiDu/giphy.gif",
  },
  {
    id: "sad",
    label: "Sad",
    url: "https://media.giphy.com/media/3o7abldet0i7nFzJ0c/giphy.gif",
  },
  {
    id: "yes",
    label: "Yes",
    url: "https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif",
  },
  {
    id: "no",
    label: "No",
    url: "https://media.giphy.com/media/3o6Zt4819NFAGQSU0g/giphy.gif",
  },
  {
    id: "fire",
    label: "Fire",
    url: "https://media.giphy.com/media/3o7aCTPPm4OHfRLSH6/giphy.gif",
  },
];

export function findGifByUrl(url: string): GifOption | undefined {
  return GIF_OPTIONS.find((g) => g.url === url);
}
