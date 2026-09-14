// data/guideData.js
import { part1 } from './curriculum/part1';
import { part2 } from './curriculum/part2';

// আমরা এখানে পার্ট ১ এবং পার্ট ২ কে একটি সিঙ্গেল অ্যারেতে যুক্ত করে দিচ্ছি
export const megaCurriculum = [
  ...part1,
  ...part2
];
