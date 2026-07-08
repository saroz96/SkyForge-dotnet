
using System;
using System.Collections.Generic;

namespace SkyForge.Dto.CompanyDto
{
    public class CompanyDataSizeDTO
    {
        public Guid CompanyId { get; set; }
        public string CompanyName { get; set; }
        public long TotalSizeInBytes { get; set; }
        public string TotalSizeFormatted { get; set; }
        public Dictionary<string, long> TableSizes { get; set; }
        public int TotalRecords { get; set; }
        public Dictionary<string, int> RecordCounts { get; set; }
        public DateTime CalculatedAt { get; set; }
    }
}