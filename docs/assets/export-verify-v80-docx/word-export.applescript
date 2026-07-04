tell application "Microsoft Word"
  activate
  set docFile to POSIX file "/Users/joekindon/Documents/Hebrew-Contour-App/docs/assets/export-verify-v80-docx/job19-contour-export.docx"
  set pdfFile to POSIX file "/Users/joekindon/Documents/Hebrew-Contour-App/docs/assets/export-verify-v80-docx/job19-contour-export-word.pdf"
  set openedDoc to open docFile
  delay 3
  save as openedDoc file name pdfFile file format format PDF
  close openedDoc saving no
end tell