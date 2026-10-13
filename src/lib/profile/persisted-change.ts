export interface PersistedProfileChange {
  studioId: string;
  kind: 'profile' | 'images' | 'visibility' | 'privacy' | 'emailVerification';
}
