import Papa from 'papaparse';
import { parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';

export interface QuizRawData {
  geral: any[];
  captura: any[];
}

export async function fetchQuizData(): Promise<QuizRawData> {
  const fetchCsv = async (url: string) => {
    const response = await fetch(`/api/csv?url=${encodeURIComponent(url)}`);
    const text = await response.text();
    return Papa.parse(text, { header: true }).data;
  };

  const [geral, captura] = await Promise.all([
    fetchCsv("https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5rGTYmbfLNUa7gi2Al5zteZ9sJNJuzxGhNCRwnH3hYoPuAuOdug5JkUlcOMtVpwKJkEZQZZIXrcHn/pub?output=csv&gid=0"),
    fetchCsv("https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5rGTYmbfLNUa7gi2Al5zteZ9sJNJuzxGhNCRwnH3hYoPuAuOdug5JkUlcOMtVpwKJkEZQZZIXrcHn/pub?output=csv&gid=1420757367")
  ]);

  return { geral, captura };
}
