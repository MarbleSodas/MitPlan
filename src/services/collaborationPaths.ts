export const PLAN_COLLABORATION_PATH = 'planCollaboration';

export function getPlanRoomId(planId: string): string {
  return `plan:${planId}`;
}

export function getTimelineRoomId(timelineId: string): string {
  return `timeline:${timelineId}`;
}

export function normalizeCollaborationRoomId(roomId: string): string {
  if (roomId.includes(':')) {
    return roomId;
  }

  return getPlanRoomId(roomId);
}

export function getPlanCollaborationRoot(roomId: string): string {
  return `${PLAN_COLLABORATION_PATH}/${normalizeCollaborationRoomId(roomId)}`;
}

export function getActiveUsersPath(roomId: string): string {
  return `${getPlanCollaborationRoot(roomId)}/activeUsers`;
}

export function getActiveUserPath(roomId: string, sessionId: string): string {
  return `${getActiveUsersPath(roomId)}/${sessionId}`;
}

export function getPresenceRoot(roomId: string): string {
  return `${getPlanCollaborationRoot(roomId)}/presence`;
}

export function getPresencePath(roomId: string, sessionId: string): string {
  return `${getPresenceRoot(roomId)}/${sessionId}`;
}

export function getJobAssignmentsPath(roomId: string): string {
  return `${getPlanCollaborationRoot(roomId)}/jobAssignments`;
}

export function getJobAssignmentPath(roomId: string, jobId: string): string {
  return `${getJobAssignmentsPath(roomId)}/${jobId}`;
}
