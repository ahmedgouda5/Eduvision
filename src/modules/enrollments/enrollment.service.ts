type Idata = {
  userId: string;
  courseId: string;
};

export class EnrollmentService {
  async createEnrollment(enrollmentData: Idata): Promise<any> {
    // Implement the logic to create an enrollment

    // For example, you can save the enrollmentData to a database
    return { message: "Enrollment created successfully", data: enrollmentData };
  }
}
