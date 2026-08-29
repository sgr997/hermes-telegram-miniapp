export function DnaLoader() {
  return (
    <div className="dna-loader" role="status" aria-label="加载中">
      <div className="dna-spinner" />
      <style>{`
        .dna-loader {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
        }
        .dna-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #e4e4e7;
          border-top-color: #4f46e5;
          border-radius: 50%;
          animation: dna-spin 600ms linear infinite;
        }
        @keyframes dna-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}