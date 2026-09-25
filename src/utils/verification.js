export const hasLinkedParent = (student) => {
  if (!student) return false;
  if (student.roleData?.parent_id) return true;
  if (student.student_parent_id) return true;
  if (student.parent_id) return true;
  return false;
};

export const getParentLinkVerificationStatus = (student) => {
  if (!student) return false;
  if (student.roleData?.is_verified !== undefined) {
    return !!student.roleData.is_verified;
  }
  if (student.student_is_verified !== undefined) {
    return !!student.student_is_verified;
  }
  if (student.is_verified !== undefined) {
    return !!student.is_verified;
  }
  return false;
};

export const getParentLinkVerifiedAt = (student) =>
  student?.roleData?.verified_at ||
  student?.verified_at ||
  null;

export const getStudentDisplayName = (student) => {
  if (!student) return "this student";
  const name = [student.first_name, student.last_name].filter(Boolean).join(" ");
  return name || "this student";
};

export const getParentDisplayName = (student, parentUser = null) => {
  if (parentUser) {
    const name = [parentUser.first_name, parentUser.last_name]
      .filter(Boolean)
      .join(" ");
    if (name) return name;
  }

  const roleData = student?.roleData;
  if (roleData?.parent_first_name) {
    return `${roleData.parent_first_name} ${roleData.parent_last_name || ""}`.trim();
  }

  if (student?.parent_first_name) {
    return `${student.parent_first_name} ${student.parent_last_name || ""}`.trim();
  }

  return "the linked parent";
};

export const getVerificationStatus = getParentLinkVerificationStatus;
export const getVerifiedAt = getParentLinkVerifiedAt;
