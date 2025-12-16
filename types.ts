export interface Contact {
  [key: string]: string;
}

export interface EmailTemplate {
  subject: string;
  body: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

export enum AppState {
  DASHBOARD = 'DASHBOARD',
  CONTACTS = 'CONTACTS',
  COMPOSE = 'COMPOSE',
  SENDING = 'SENDING',
  SETTINGS = 'SETTINGS'
}

export interface CampaignStats {
  sent: number;
  failed: number;
  total: number;
  logs: string[];
}

export interface CampaignRecord {
  id?: string;
  date: any; // Firestore Timestamp
  subject: string;
  sent: number;
  failed: number;
  total: number;
}