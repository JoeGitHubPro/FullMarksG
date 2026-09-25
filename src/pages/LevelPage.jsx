import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  HiOutlineArrowLeft,
  HiOutlineClock,
  HiOutlineUser,
} from "react-icons/hi";
import { api, getFileUrl } from "../api";

const LevelPage = () => {
  const { slug } = useParams();
  const [level, setLevel] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLevelData = async () => {
      setLoading(true);
      try {
        // 1. Get all levels and find the matching one
        const levelsRes = await api.getAllLevels();
        if (!levelsRes.success) throw new Error("Failed to load levels");
        const foundLevel = levelsRes.data.find((l) => l.slug === slug);
        if (!foundLevel) throw new Error("Level not found");
        setLevel(foundLevel);

        // 2. Fetch courses for this level
        const coursesRes = await api.getAllCourses({
          academicLevelId: foundLevel.id,
          status: "published",
          limit: 50,
        });
        if (coursesRes.success) setCourses(coursesRes.data);
      } catch (error) {
        console.error("Error loading level page:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLevelData();
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 flex justify-center">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!level) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold">Level not found</h2>
        <Link to="/" className="text-brand-purple hover:underline mt-4 inline-block">
          Go back home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      {/* Back button */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-[#2e0854] transition-colors mb-6"
      >
        <HiOutlineArrowLeft />
        <span>Back to Home</span>
      </Link>

      {/* Level header */}
      <div className="mb-12">
        <h1 className="text-3xl sm:text-4xl font-black font-heading tracking-tight text-[#2e0854]">
          {level.name}
        </h1>
        {level.description && (
          <p className="text-gray-500 text-base font-light mt-2 max-w-2xl">
            {level.description}
          </p>
        )}
        <div className="mt-3 flex items-center gap-4 text-sm text-gray-400">
          <span>{courses.length} courses</span>
        </div>
      </div>

      {/* Courses grid */}
      {courses.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-2xl">
          <p className="text-sm text-gray-400">
            No courses available for this level yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Link
              key={course.id}
              to={`/courses/${course.slug}`}
              className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden group"
            >
              {course.cover_image_url && (
                <div
                  className="aspect-video w-full bg-gray-100 shrink-0"
                  style={{
                    backgroundImage: `url(${getFileUrl(course.cover_image_url)})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
              )}
              <div className="p-5 flex-1 space-y-3">
                {course.subjects && course.subjects.length > 0 && (
                  <span className="text-[10px] font-bold text-brand-purple bg-violet-50 px-2 py-0.5 rounded-md tracking-wider uppercase inline-block">
                    {course.subjects[0].name}
                  </span>
                )}
                <h3 className="font-heading font-black text-sm text-[#2e0854] group-hover:text-brand-purple transition-colors line-clamp-1">
                  {course.title}
                </h3>
                <p className="text-xs text-gray-400 font-light leading-relaxed line-clamp-2">
                  {course.description}
                </p>
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                  <HiOutlineUser className="text-xs" />
                  <span>
                    {course.instructor_first_name} {course.instructor_last_name}
                  </span>
                </div>
              </div>
              <div className="mt-2 pt-4 border-t border-gray-50 px-5 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-1 text-gray-400 text-[11px]">
                  <HiOutlineClock className="text-xs text-gray-300" />
                  <span className="font-light">{course.term || "N/A"}</span>
                </div>
                <span className="text-xs font-black font-mono text-[#2e0854]">
                  {Number(course.price) > 0 ? `EGP ${course.price}` : "Free"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default LevelPage;
