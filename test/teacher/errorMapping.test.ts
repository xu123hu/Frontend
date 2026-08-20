import { describe, it, expect } from 'vitest'
import { handleTeacherError, isStableTeacherError } from '@/api/teacherErrors'

describe('teacher error handling mapping', () => {
  it('redirects to login on 401 unauthorized', () => {
    expect(handleTeacherError(40100)).toEqual({ kind: 'redirect-login' })
  })
  it('clears class scope cache on 40302 with classId', () => {
    expect(handleTeacherError(40302, 'c-7')).toEqual({ kind: 'clear-class-scope', classId: 'c-7' })
  })
  it('surfaces version conflict on 40901', () => {
    expect(handleTeacherError(40901)).toEqual({ kind: 'version-conflict' })
  })
  it('opens confirmation panel on 42210', () => {
    expect(handleTeacherError(42210)).toEqual({ kind: 'confirmation-required' })
  })
  it('keeps editable degraded artifact on 50310', () => {
    expect(handleTeacherError(50310)).toEqual({ kind: 'show-degraded' })
  })
  it('shows recoverable action on 50311', () => {
    expect(handleTeacherError(50311)).toEqual({ kind: 'show-unavailable' })
  })
  it('falls back to toast for unknown codes', () => {
    expect(handleTeacherError(50000)).toEqual({ kind: 'toast' })
  })
  it('recognizes stable teacher error codes', () => {
    expect(isStableTeacherError(40901)).toBe(true)
    expect(isStableTeacherError(99999)).toBe(false)
  })
})