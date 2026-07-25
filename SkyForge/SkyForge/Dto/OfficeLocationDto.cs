using System;
using System.Collections.Generic;
using SkyForge.Models.CompanyModel;

namespace SkyForge.Dto
{
    public class OfficeLocationResponseDto
    {
        public CompanyInfoDto Company { get; set; } = new CompanyInfoDto();
        public List<OfficeLocation> OfficeLocations { get; set; } = new List<OfficeLocation>();
        public bool GeoFencingEnabled { get; set; }
    }

    public class OfficeLocationRequestDto
    {
        public Guid CompanyId { get; set; }
        public string Name { get; set; } = string.Empty;
        public CoordinatesDto Coordinates { get; set; } = new CoordinatesDto();
        public int Radius { get; set; } = 100;
        public string? Address { get; set; }
    }

    public class CoordinatesDto
    {
        public double Lat { get; set; }
        public double Lng { get; set; }
    }

    public class UpdateOfficeLocationDto
    {
        public Guid CompanyId { get; set; }
        public string? Name { get; set; }
        public CoordinatesDto? Coordinates { get; set; }
        public int? Radius { get; set; }
        public string? Address { get; set; }
        public bool? IsActive { get; set; }
    }

    public class ToggleGeoFencingDto
    {
        public Guid CompanyId { get; set; }
        public bool Enabled { get; set; }
    }
}