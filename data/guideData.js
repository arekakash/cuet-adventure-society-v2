// data/guideData.js
import { part1 } from './curriculum/part1';
import { part2 } from './curriculum/part2';
import { part3 } from './curriculum/part3';
import { part4 } from './curriculum/part4';
import { part5 } from './curriculum/part5';

// আমরা এখানে ৫টি পার্টকেই একটি সিঙ্গেল অ্যারেতে যুক্ত করে দিচ্ছি
export const megaCurriculum = [
  ...part1,
  ...part2,
  ...part3,
  ...part4,
  ...part5
];
