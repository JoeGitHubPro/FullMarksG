export const STUDENT_TYPES = [
  { value: "online", label: "Online" },
  { value: "center", label: "Center" },
];

export const getStudentType = (student) =>
  student?.roleData?.student_type || student?.student_type || "online";

export const getStudentTypeLabel = (student) => {
  const type = getStudentType(student);
  return STUDENT_TYPES.find((item) => item.value === type)?.label || "Online";
};
