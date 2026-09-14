// app/beginners-guide/page.js
import Link from 'next/link';
import { guideData } from '@/data/guideData'; // পাথটি তোমার ফোল্ডার স্ট্রাকচার অনুযায়ী ঠিক আছে কিনা দেখে নিও

export default function BeginnersGuidePage() {
  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">বিগিনার্স গাইড</h1>
          <p className="text-lg text-gray-600">
            অ্যাডভেঞ্চারের দুনিয়ায় তোমার প্রথম কদম। মডিউলগুলো পড়ে কুইজে অংশ নাও এবং তোমার 'Survival IQ' বাড়িয়ে লিডারবোর্ডে এগিয়ে যাও!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {guideData.map((module) => (
            <div key={module.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-gray-100">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-3">{module.title}</h2>
                <p className="text-gray-600 mb-6">{module.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                    {module.lessons.length} টি লেসন
                  </span>
                  <Link 
                    href={`/beginners-guide/lesson?moduleId=${module.id}&lessonId=${module.lessons[0]?.id}`}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
                  >
                    শুরু করুন
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
