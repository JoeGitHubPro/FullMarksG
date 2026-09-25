import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  HiOutlineArrowLeft,
  HiOutlineCollection,
  HiOutlineChartBar,
  HiOutlineUser,
  HiOutlineUserGroup,
} from "react-icons/hi";
import { api, getFileUrl } from "../api";

const InstructorDetailPage = () => {
  const { slug: id } = useParams(); // route param kept as "slug" for URL compatibility, value is the instructor id
  const navigate = useNavigate();

  const [instructor, setInstructor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchInstructor = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.getPublicInstructorById(id);
        if (response.success) {
          setInstructor(response.data);
        } else {
          setError(response.message || "Instructor not found.");
        }
      } catch (err) {
        setError(err.message || "Network error.");
      } finally {
        setLoading(false);
      }
    };

    fetchInstructor();
  }, [id]);

  if (loading) {
    return (
      <div className="h-96 w-full flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">
          Loading instructor profile...
        </p>
      </div>
    );
  }

  if (error || !instructor) {
    return (
      <div className="text-center py-20 border border-dashed border-gray-200 bg-gray-50/50 rounded-2xl space-y-4 animate-fadeIn">
        <h3 className="font-heading font-black text-lg text-[#2e0854]">
          Instructor Not Found
        </h3>
        <p className="text-xs text-gray-400 max-w-xs mx-auto">
          {error || "The requested instructor profile could not be retrieved."}
        </p>
        <Link
          to="/instructors"
          className="inline-flex items-center space-x-2 text-xs font-bold text-brand-purple hover:text-brand"
        >
          <HiOutlineArrowLeft />
          <span>Return to Instructors</span>
        </Link>
      </div>
    );
  }

  const {
    first_name,
    last_name,
    bio,
    profile_image_url,
    subjects = [],
    courses = [],
    assistants = [],
  } = instructor;

  const fullName = `${first_name} ${last_name}`;
  const totalEnrolled = courses.reduce(
    (sum, c) => sum + (c.enrolled_count || 0),
    0,
  );

  return (
    <div className="space-y-10 py-2 animate-fadeIn">
      <button
        onClick={() => navigate("/instructors")}
        className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-[#2e0854] transition-colors"
      >
        <HiOutlineArrowLeft className="text-sm" />
        <span>Return to Instructors</span>
      </button>

      {/* HERO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-8 border-b border-gray-100 items-start">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-start gap-6">
            <div className="w-32 h-32 rounded-3xl bg-gray-50 border border-gray-100 shrink-0 overflow-hidden flex items-center justify-center text-gray-300">
              {profile_image_url ? (
                <img
                  src={getFileUrl(profile_image_url)}
                  alt={fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <HiOutlineUser className="text-5xl" />
              )}
            </div>
            <div>
              {subjects.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {subjects.map((s) => (
                    <span
                      key={s.id}
                      className="text-[10px] font-black tracking-widest text-brand-purple uppercase bg-violet-50 px-2.5 py-1 rounded-md"
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
              )}
              <h1 className="text-2xl font-black text-[#2e0854] tracking-tight font-heading leading-tight sm:text-3xl">
                {fullName}
              </h1>
              <p className="text-xs font-semibold text-gray-400 mt-0.5">
                Instructor
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400 font-light leading-relaxed">
            {bio || "No bio provided yet."}
          </p>
        </div>

        {/* Stat Block */}
        <div className="bg-gray-50/70 border border-gray-100 rounded-2xl p-5 space-y-3.5 shadow-2xs">
          <div className="flex items-center space-x-3 text-xs">
            <HiOutlineCollection className="text-base text-brand-purple shrink-0" />
            <div>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider leading-none">
                Active Courses
              </p>
              <p className="font-bold text-[#2e0854] mt-1">{courses.length}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 text-xs">
            <HiOutlineChartBar className="text-base text-brand-purple shrink-0" />
            <div>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider leading-none">
                Total Enrolled Students
              </p>
              <p className="font-bold text-[#2e0854] mt-1">{totalEnrolled}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 text-xs">
            <HiOutlineUserGroup className="text-base text-brand-purple shrink-0" />
            <div>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider leading-none">
                Assistants
              </p>
              <p className="font-bold text-[#2e0854] mt-1">
                {assistants.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* COURSES + ASSISTANTS */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        {/* Courses */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center space-x-2 px-1">
            <HiOutlineCollection className="text-sm text-brand-purple" />
            <h3 className="font-heading font-black text-sm text-[#2e0854]">
              Active Courses
            </h3>
          </div>

          {courses.length > 0 ? (
            <div className="space-y-3">
              {courses.map((course) => (
                <Link
                  key={course.id}
                  to={`/courses/${course.slug}`}
                  className="block bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-md hover:border-gray-200 transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[9px] font-black tracking-widest text-brand-purple uppercase bg-violet-50 px-2 py-0.5 rounded-md">
                        {course.term}
                      </span>
                      <h4 className="text-xs font-bold text-[#2e0854] group-hover:text-brand-purple transition-colors mt-2 font-heading truncate">
                        {course.title}
                      </h4>
                      {course.description && (
                        <p className="text-[10px] text-gray-400 font-light mt-0.5 line-clamp-2">
                          {course.description}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md shrink-0">
                      {course.enrolled_count || 0} enrolled
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 border border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
              <p className="text-xs text-gray-400 font-light">
                No published courses yet.
              </p>
            </div>
          )}
        </div>

        {/* Assistants */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center space-x-2 px-1">
            <HiOutlineUserGroup className="text-sm text-brand-purple" />
            <h3 className="font-heading font-black text-sm text-[#2e0854]">
              Teaching Assistants
            </h3>
          </div>

          {assistants.length > 0 ? (
            <div className="space-y-3">
              {assistants.map((a) => (
                <div
                  key={a.id}
                  className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 shrink-0 overflow-hidden flex items-center justify-center text-gray-300">
                    {a.profile_image_url ? (
                      <img
                        src={getFileUrl(a.profile_image_url)}
                        alt={`${a.first_name} ${a.last_name}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <HiOutlineUser className="text-base" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#2e0854] truncate">
                      {a.first_name} {a.last_name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 border border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
              <p className="text-xs text-gray-400 font-light">
                No assistants assigned yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstructorDetailPage;
