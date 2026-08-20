import { defineStore } from 'pinia'

export interface TeacherContextState {
  classId: string | null
  className: string | null
  courseId: string | null
  courseName: string | null
  date: string
}

export const useTeacherContextStore = defineStore('teacherContext', {
  state: (): TeacherContextState => ({
    classId: null,
    className: null,
    courseId: null,
    courseName: null,
    date: new Date().toISOString().slice(0, 10),
  }),
  actions: {
    setClass(classId: string | null, className: string | null) {
      this.classId = classId || null
      this.className = className || null
    },
    setCourse(courseId: string | null, courseName: string | null) {
      this.courseId = courseId || null
      this.courseName = courseName || null
    },
    /** 切角色/切班级后清空不属于新 scope 的数据 */
    reset() {
      this.classId = null
      this.className = null
      this.courseId = null
      this.courseName = null
    },
  },
})