function calculateStatistics(aggregatedContent, xmlFileSize) {
  const { textFiles, binaryFiles, errors } = aggregatedContent;

  const totalTextSize = textFiles.reduce((sum, file) => sum + file.size, 0);
  const totalBinarySize = binaryFiles.reduce((sum, file) => sum + file.size, 0);
  const totalSize = totalTextSize + totalBinarySize;

  const totalLines = textFiles.reduce((sum, file) => sum + file.lines, 0);

  const estimatedTokens = Math.ceil(xmlFileSize / 4);

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return {
    totalFiles: textFiles.length + binaryFiles.length,
    textFiles: textFiles.length,
    binaryFiles: binaryFiles.length,
    errorFiles: errors.length,
    totalSize: formatSize(totalSize),
    xmlSize: formatSize(xmlFileSize),
    totalLines,
    estimatedTokens: estimatedTokens.toLocaleString(),
  };
}

module.exports = { calculateStatistics };
