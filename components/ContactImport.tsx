import React, { useState, useRef } from 'react';
import { Upload, FileText, Trash2, AlertCircle, Cloud, Loader2 } from 'lucide-react';
import { Contact } from '../types';
import { collection, writeBatch, doc, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

interface ContactImportProps {
  contacts: Contact[];
  setContacts: (contacts: Contact[]) => void;
  isAuthenticated: boolean;
}

const ContactImport: React.FC<ContactImportProps> = ({ contacts, setContacts, isAuthenticated }) => {
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);

    if (!file) return;

    if (file.type !== "text/csv" && !file.name.endsWith('.csv')) {
      setError("Please upload a valid CSV file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const rows = text.split('\n').map(row => row.trim()).filter(row => row.length > 0);
        
        if (rows.length < 2) {
          setError("CSV file is empty or only has headers.");
          return;
        }

        const headers = rows[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const newContacts: Contact[] = [];

        for (let i = 1; i < rows.length; i++) {
          const values = rows[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          // Simple CSV parsing
          if (values.length === headers.length) {
            const contact: Contact = {};
            headers.forEach((header, index) => {
              contact[header] = values[index];
            });
            newContacts.push(contact);
          }
        }

        await uploadToCloud(newContacts);
        
      } catch (err) {
        console.error(err);
        setError("Failed to parse CSV file or upload to cloud.");
      }
    };
    reader.readAsText(file);
  };

  const uploadToCloud = async (newContacts: Contact[]) => {
    if (!isAuthenticated) {
        setError("Authentication not ready. Please wait a moment or refresh the page.");
        return;
    }

    setIsUploading(true);
    setError(null);
    try {
        const batchSize = 500;
        const chunks = [];
        
        for (let i = 0; i < newContacts.length; i += batchSize) {
            chunks.push(newContacts.slice(i, i + batchSize));
        }

        let uploadedCount = 0;

        for (const chunk of chunks) {
            const batch = writeBatch(db);
            chunk.forEach(contact => {
                const ref = doc(collection(db, "contacts"));
                batch.set(ref, contact);
            });
            await batch.commit();
            uploadedCount += chunk.length;
        }
        
        // Clear input
        if (fileInputRef.current) fileInputRef.current.value = '';

    } catch (err: any) {
        console.error("Firebase Upload Error:", err);
        // Provide specific advice based on the error code
        if (err.code === 'permission-denied') {
            setError("PERMISSION DENIED: You must update your Firestore Security Rules in the Firebase Console. Set them to: allow read, write: if request.auth != null;");
        } else if (err.code === 'unavailable') {
            setError("NETWORK ERROR: Could not connect to Firestore. Check your internet connection.");
        } else {
            setError(`Upload failed: ${err.message || "Unknown error"}`);
        }
    } finally {
        setIsUploading(false);
    }
  };

  const clearCloudContacts = async () => {
    if(!window.confirm("Are you sure? This will delete all contacts from the Cloud Database.")) return;

    setIsUploading(true);
    try {
        const querySnapshot = await getDocs(collection(db, "contacts"));
        const batches = [];
        let batch = writeBatch(db);
        let count = 0;

        querySnapshot.forEach((doc) => {
            batch.delete(doc.ref);
            count++;
            if (count >= 500) {
                batches.push(batch.commit());
                batch = writeBatch(db);
                count = 0;
            }
        });
        if (count > 0) batches.push(batch.commit());

        await Promise.all(batches);
        setContacts([]); // Optimistic update
    } catch (err: any) {
        if (err.code === 'permission-denied') {
            setError("PERMISSION DENIED: Cannot delete. Check Firestore Rules.");
        } else {
            setError("Failed to delete contacts.");
        }
    } finally {
        setIsUploading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Cloud className="text-purple-600" />
            Cloud Contacts Database
          </h2>
          {contacts.length > 0 && (
            <button
              onClick={clearCloudContacts}
              disabled={isUploading}
              className="text-red-500 hover:text-red-700 flex items-center gap-2 text-sm font-medium disabled:opacity-50"
            >
              {isUploading ? <Loader2 className="animate-spin" size={16}/> : <Trash2 size={16} />}
              Clear Database
            </button>
          )}
        </div>

        {isUploading && (
             <div className="mb-6 bg-blue-50 text-blue-700 p-4 rounded-lg flex items-center gap-2">
                 <Loader2 className="animate-spin" /> Syncing with Cloud Database...
             </div>
        )}

        {contacts.length === 0 ? (
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:border-purple-400 transition-colors bg-slate-50">
            <div className="flex justify-center mb-4">
              <div className="bg-purple-100 p-4 rounded-full">
                <FileText size={40} className="text-purple-600" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-slate-800 mb-2">Upload to Cloud Database</h3>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
              Upload a <strong>CSV file exported from Excel</strong>. Contacts will be securely stored in your Firestore cloud database.
            </p>
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className={`inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium cursor-pointer transition shadow-lg shadow-purple-600/30 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {isUploading ? 'Uploading...' : 'Select CSV File'}
            </label>
            {error && (
              <div className="mt-4 p-3 bg-red-50 rounded border border-red-200 flex items-start text-left justify-center text-red-700 gap-2">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-slate-600">
                Found <span className="font-bold text-slate-900">{contacts.length}</span> contacts in database.
              </p>
              <div className="text-sm text-slate-500 italic">
                Previewing first 10 rows
              </div>
            </div>
            
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-100 text-slate-800 font-semibold uppercase text-xs">
                  <tr>
                    {Object.keys(contacts[0]).map((header) => (
                      <th key={header} className="px-6 py-3 whitespace-nowrap">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {contacts.slice(0, 10).map((contact, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      {Object.values(contact).map((value, vIdx) => (
                        <td key={vIdx} className="px-6 py-3 whitespace-nowrap">{value}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {contacts.length > 10 && (
              <p className="text-center text-xs text-slate-400 mt-4">
                ...and {contacts.length - 10} more.
              </p>
            )}
            
            {error && (
               <div className="mt-4 p-3 bg-red-50 rounded border border-red-200 flex items-center justify-center text-red-700 gap-2">
                <AlertCircle size={18} />
                <span className="text-sm">{error}</span>
               </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
        <h4 className="font-semibold text-purple-900 mb-2">Tip for Personalization</h4>
        <p className="text-sm text-purple-700">
          Make sure your Excel/CSV headers are clean (e.g., "Name", "Email"). You can use these headers as variables in your email template like <code>{`{{Name}}`}</code> or <code>{`{{Company}}`}</code>.
        </p>
      </div>
    </div>
  );
};

export default ContactImport;