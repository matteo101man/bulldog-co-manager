import React, { useState, useEffect, useRef } from 'react';

interface ExpenseRequestFormProps {
  onBack: () => void;
}

interface FormData {
  name: string;
  dateOfRequest: string;
  position: string;
  vendor: string;
  purposeOfExpense: string;
  paymentMethod: 'cadet-fund-card' | 'reimbursement-check' | '';
  items: string[];
  totalExpectedExpenses: string;
  budgetCategory: string;
  allottedBudget: string;
  additionalComments: string;
  acknowledged: boolean;
}

const FORM_STORAGE_KEY = 'expenseRequestForm';

const getInitialFormData = (): FormData => ({
  name: '',
  dateOfRequest: '',
  position: '',
  vendor: '',
  purposeOfExpense: '',
  paymentMethod: '',
  items: [''],
  totalExpectedExpenses: '',
  budgetCategory: '',
  allottedBudget: '',
  additionalComments: 'I, __________, understand and acknowledge that reimbursement for expenses is contingent upon following the established process, including obtaining proper approvals and submitting the necessary documentation. I also accept that failure to comply with these requirements or discrepancies between requested and actual expenses may result in denial of reimbursement or reimbursement limited to the amount requested.',
  acknowledged: false,
});

export default function ExpenseRequestForm({ onBack }: ExpenseRequestFormProps) {
  const formRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState<FormData>(getInitialFormData());
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    // Always start fresh - clear any saved form data on mount (fresh start on refresh)
    localStorage.removeItem(FORM_STORAGE_KEY);
  }, []);

  useEffect(() => {
    // Clear form data when component unmounts (user goes back or navigates away)
    return () => {
      localStorage.removeItem(FORM_STORAGE_KEY);
    };
  }, []);

  function updateField<K extends keyof FormData>(field: K, value: FormData[K]) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  function addItem() {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, '']
    }));
  }

  function removeItem(index: number) {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  }

  function updateItem(index: number, value: string) {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? value : item)
    }));
  }

  async function saveAsPDF() {
    if (!formRef.current) return;

    setIsGeneratingPDF(true);

    try {
      // Dynamically load html2canvas and jspdf from CDN
      const loadScript = (src: string): Promise<void> => {
        return new Promise((resolve, reject) => {
          if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
          }
          const script = document.createElement('script');
          script.src = src;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error(`Failed to load ${src}`));
          document.head.appendChild(script);
        });
      };

      await Promise.all([
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'),
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
      ]);

      // Wait a bit for buttons to be hidden and DOM to update
      await new Promise(resolve => setTimeout(resolve, 200));

      // @ts-ignore - html2canvas is loaded from CDN
      const html2canvas = window.html2canvas;
      // @ts-ignore - jsPDF is loaded from CDN
      const { jsPDF } = window.jspdf;

      // Scroll to top to ensure we capture everything
      window.scrollTo(0, 0);
      formRef.current.scrollIntoView({ behavior: 'instant', block: 'start' });

      const canvas = await html2canvas(formRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: formRef.current.scrollWidth,
        windowHeight: formRef.current.scrollHeight,
        allowTaint: false,
        removeContainer: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save('expense-request-form.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  }

  function handleBack() {
    // Clear form data when going back
    localStorage.removeItem(FORM_STORAGE_KEY);
    onBack();
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-safe-area-inset-bottom">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 safe-area-inset-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Expense Request Form</h1>
          <div className="flex gap-2">
            <button
              onClick={saveAsPDF}
              className="text-sm text-blue-600 font-medium touch-manipulation px-2"
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              Save
            </button>
            <button
              onClick={handleBack}
              className="text-sm text-blue-600 font-medium touch-manipulation"
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              Back
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 py-4">
        <div ref={formRef} className="bg-white p-6 max-w-4xl mx-auto shadow-sm border border-gray-300" style={{ fontFamily: 'Arial, sans-serif', overflow: 'visible' }}>
          {/* Header */}
          <h1 className="text-3xl font-bold text-center mb-2" style={{ fontSize: '28px' }}>Expense Request Form</h1>
          
          {/* Instructions */}
          <div className="text-center mb-4">
            <p className="font-bold text-sm mb-1">***DOWNLOAD A COPY TO MAKE EDITS ***</p>
            <p className="font-bold text-sm">*** RECEIPTS MUST BE PROVIDED***</p>
          </div>

          {/* Personal and Request Details */}
          <div className="mb-4">
            <table className="w-full border-collapse border border-gray-300">
              <tbody>
                <tr>
                  <td className="border border-gray-300 p-2 font-semibold" style={{ width: '15%' }}>Name:</td>
                  <td className="border border-gray-300 p-2" style={{ width: '35%' }}>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder="Isabella Navarro"
                      className="w-full border-0 outline-none bg-transparent placeholder:text-gray-400 text-gray-900"
                    />
                  </td>
                  <td className="border border-gray-300 p-2 font-semibold" style={{ width: '20%' }}>Date of Request:</td>
                  <td className="border border-gray-300 p-2" style={{ width: '30%' }}>
                    <input
                      type="text"
                      value={formData.dateOfRequest}
                      onChange={(e) => updateField('dateOfRequest', e.target.value)}
                      placeholder="12/1/25"
                      className="w-full border-0 outline-none bg-transparent placeholder:text-gray-400 text-gray-900"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-2 font-semibold">Position:</td>
                  <td className="border border-gray-300 p-2">
                    <input
                      type="text"
                      value={formData.position}
                      onChange={(e) => updateField('position', e.target.value)}
                      placeholder="Military Ball OIC"
                      className="w-full border-0 outline-none bg-transparent placeholder:text-gray-400 text-gray-900"
                    />
                  </td>
                  <td className="border border-gray-300 p-2 font-semibold">Vendor:</td>
                  <td className="border border-gray-300 p-2">
                    <input
                      type="text"
                      value={formData.vendor}
                      onChange={(e) => updateField('vendor', e.target.value)}
                      placeholder="Botanical Gardens"
                      className="w-full border-0 outline-none bg-transparent placeholder:text-gray-400 text-gray-900"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-2 font-semibold">Purpose of Expense:</td>
                  <td colSpan={3} className="border border-gray-300 p-2">
                    <input
                      type="text"
                      value={formData.purposeOfExpense}
                      onChange={(e) => updateField('purposeOfExpense', e.target.value)}
                      placeholder="Venue Rental"
                      className="w-full border-0 outline-none bg-transparent placeholder:text-gray-400 text-gray-900"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Method of Payment */}
          <div className="mb-4">
            <p className="font-semibold mb-2">Method of Payment (Check one):</p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.paymentMethod === 'cadet-fund-card'}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateField('paymentMethod', 'cadet-fund-card');
                    } else {
                      updateField('paymentMethod', '');
                    }
                  }}
                  className="w-4 h-4"
                />
                <span>Cadet Fund Card</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.paymentMethod === 'reimbursement-check'}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateField('paymentMethod', 'reimbursement-check');
                    } else {
                      updateField('paymentMethod', '');
                    }
                  }}
                  className="w-4 h-4"
                />
                <span>Reimbursement Check</span>
              </label>
            </div>
          </div>

          {/* Itemized Expenses */}
          <div className="mb-4">
            <p className="font-semibold mb-2">Itemized List of Expenses:</p>
            <div className="space-y-2">
              {formData.items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-lg">•</span>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updateItem(index, e.target.value)}
                    placeholder={index === 0 ? "Conservatory Great room and Gardenside" : "Enter expense item"}
                    className="flex-1 border-0 outline-none bg-transparent placeholder:text-gray-400 text-gray-900"
                  />
                  {!isGeneratingPDF && formData.items.length > 1 && (
                    <button
                      onClick={() => removeItem(index)}
                      className="text-red-600 font-bold text-lg px-2 touch-manipulation"
                      style={{ minHeight: '44px', minWidth: '44px' }}
                    >
                      −
                    </button>
                  )}
                  {!isGeneratingPDF && index === formData.items.length - 1 && (
                    <button
                      onClick={addItem}
                      className="text-blue-600 font-bold text-lg px-2 touch-manipulation"
                      style={{ minHeight: '44px', minWidth: '44px' }}
                    >
                      +
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="mb-4">
            <table className="w-full border-collapse border border-gray-300">
              <tbody>
                <tr>
                  <td className="border border-gray-300 p-2 font-semibold">Total Expected Expenses (Include tax):</td>
                  <td className="border border-gray-300 p-2">
                    <input
                      type="text"
                      value={formData.totalExpectedExpenses}
                      onChange={(e) => updateField('totalExpectedExpenses', e.target.value)}
                      placeholder="$2,500"
                      className="w-full border-0 outline-none bg-transparent placeholder:text-gray-400 text-gray-900"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-2 font-semibold">Budget Category (Review the Budget List in Teams):</td>
                  <td className="border border-gray-300 p-2">
                    <input
                      type="text"
                      value={formData.budgetCategory}
                      onChange={(e) => updateField('budgetCategory', e.target.value)}
                      placeholder="Mil Ball"
                      className="w-full border-0 outline-none bg-transparent placeholder:text-gray-400 text-gray-900"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-2 font-semibold">Allotted Budget:</td>
                  <td className="border border-gray-300 p-2">
                    <input
                      type="text"
                      value={formData.allottedBudget}
                      onChange={(e) => updateField('allottedBudget', e.target.value)}
                      placeholder="$10,000"
                      className="w-full border-0 outline-none bg-transparent placeholder:text-gray-400 text-gray-900"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Additional Comments */}
          <div className="mb-4">
            <p className="font-semibold mb-2">Additional Comments:</p>
            <textarea
              value={formData.additionalComments}
              onChange={(e) => updateField('additionalComments', e.target.value)}
              className="w-full border-0 outline-none bg-transparent p-2 min-h-[100px] resize-none text-gray-900"
              style={{ 
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                overflowWrap: 'break-word'
              }}
              placeholder="I, __________, understand and acknowledge..."
            />
          </div>

          {/* Acknowledgement */}
          <div className="mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.acknowledged}
                onChange={(e) => updateField('acknowledged', e.target.checked)}
                className="w-4 h-4"
              />
              <span className="font-semibold">Check to Acknowledge</span>
            </label>
          </div>

          {/* Signatures */}
          <div className="space-y-4 mt-6">
            <div>
              <div className="border-b-2 border-gray-900 mb-1" style={{ minHeight: '50px' }}></div>
              <p className="text-sm">Battalion Commander Signature</p>
            </div>
            <div>
              <div className="border-b-2 border-gray-900 mb-1" style={{ minHeight: '50px' }}></div>
              <p className="text-sm">Battalion S8 Finance Officer Signature</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
