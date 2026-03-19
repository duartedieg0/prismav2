/**
 * Type definitions for feedback collection process
 * Corresponds to spec-process-feedback.md (Section 4)
 */

/**
 * Teacher feedback on adapted question
 */
export interface QuestionFeedback {
  /** UUID primary key */
  id: string;
  /** Reference to exam (teacher context) */
  exam_id: string;
  /** Reference to adapted question being evaluated */
  adaptation_id: string;
  /** Star rating (0-5) - nullable to support comments-only feedback */
  rating: number | null;
  /** Optional written comment from teacher */
  comment: string | null;
  /** Creation timestamp */
  created_at: string;
}

/**
 * Aggregated feedback metrics for a single adapted question
 */
export interface AdaptationMetrics {
  /** Number of ratings collected */
  rating_count: number;
  /** Average star rating (or null if no ratings) */
  average_rating: number | null;
  /** Number of written comments */
  comment_count: number;
  /** True if this question has been rated or commented on */
  has_feedback: boolean;
}

/**
 * Teacher's feedback submission for a single question
 * This is the request body for POST /api/exams/[id]/feedback
 */
export interface FeedbackSubmission {
  /** UUID of the adaptation being rated */
  adaptation_id: string;
  /** Star rating (0-5), optional for comment-only feedback */
  rating?: number | null;
  /** Written comment, optional for rating-only feedback */
  comment?: string | null;
}

/**
 * Response returned after feedback is saved
 */
export interface FeedbackResponse {
  /** Success flag */
  success: boolean;
  /** Created feedback object (if successful) */
  feedback?: QuestionFeedback;
  /** Error message (if failed) */
  error?: string;
}
