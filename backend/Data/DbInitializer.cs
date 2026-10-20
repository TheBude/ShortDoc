using Microsoft.EntityFrameworkCore;
using ShortDoc.Api.Models;

namespace ShortDoc.Api.Data;

public static class DbInitializer
{
    public static async Task InitializeAsync(ShortDocDbContext context)
    {
        // Ensure database tables exist
        await context.Database.EnsureCreatedAsync();

        try
        {
            await context.Database.ExecuteSqlRawAsync(@"
                ALTER TABLE users ADD COLUMN IF NOT EXISTS ""registrationStatus"" VARCHAR(50) DEFAULT 'APPROVED';
                DO $$ BEGIN
                    ALTER TABLE users ALTER COLUMN ""role"" TYPE VARCHAR(50) USING ""role""::text;
                    ALTER TABLE documents ALTER COLUMN ""documentType"" TYPE VARCHAR(50) USING ""documentType""::text;
                    ALTER TABLE documents ALTER COLUMN ""status"" TYPE VARCHAR(50) USING ""status""::text;
                    ALTER TABLE documents ALTER COLUMN ""priority"" TYPE VARCHAR(50) USING ""priority""::text;
                    ALTER TABLE document_approvals ALTER COLUMN ""status"" TYPE VARCHAR(50) USING ""status""::text;
                    ALTER TABLE tasks ALTER COLUMN ""status"" TYPE VARCHAR(50) USING ""status""::text;
                EXCEPTION WHEN OTHERS THEN NULL;
                END $$;
            ");
        }
        catch
        {
            // Ignore if column already exists or table not ready
        }

        // Seed additional modern departments if not present
        var requiredDepts = new (string Name, string Code, string Type)[]
        {
            ("Raqamli ta'limni rivojlantirish bo‘limi", "DIGITAL-EDU", "DEPARTMENT"),
            ("ATM", "ATM", "DEPARTMENT"),
            ("HEMIS", "HEMIS", "DEPARTMENT"),
            ("Magistratura Qabul", "MAGISTR-ADMISSION", "DEPARTMENT"),
            ("Bakalavr Qabul", "BACHELOR-ADMISSION", "DEPARTMENT"),
            ("Bilimni baholash", "ASSESSMENT", "DEPARTMENT"),
        };

        foreach (var (name, code, type) in requiredDepts)
        {
            if (!await context.Departments.AnyAsync(d => d.Code == code || d.Name == name))
            {
                context.Departments.Add(new Department { Name = name, Code = code, Type = type });
            }
        }
        await context.SaveChangesAsync();

        // 1. Seed Departments if empty
        if (!await context.Departments.AnyAsync())
        {
            var rectorate = new Department { Name = "Rektorat", Code = "RECTOR", Type = "RECTORATE" };
            var chancellery = new Department { Name = "Devonxona va umumiy bo‘lim", Code = "CHANC", Type = "CHANCELLERY" };
            var itFaculty = new Department { Name = "Axborot texnologiyalari fakulteti", Code = "IT-FAC", Type = "FACULTY" };
            var softDept = new Department { Name = "Dasturiy injiniring kafedrasi", Code = "SOFT-ENG", Type = "DEPARTMENT" };
            var finance = new Department { Name = "Buxgalteriya va moliya-reja boshqarmasi", Code = "FINANCE", Type = "ADMIN_UNIT" };

            context.Departments.AddRange(rectorate, chancellery, itFaculty, softDept, finance);
            await context.SaveChangesAsync();

            // 2. Seed Users
            var admin = new User
            {
                Email = "admin@shortdoc.uz",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
                FullName = "Super Administrator",
                Role = Role.SUPER_ADMIN,
                Position = "Bosh tizim ma’muri",
                Phone = "+998901234567",
                DepartmentId = rectorate.Id
            };

            var rektor = new User
            {
                Email = "rektor@shortdoc.uz",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Rektor123!"),
                FullName = "Prof. Abdullayev Shavkat Olimovich",
                Role = Role.LEADERSHIP,
                Position = "Universitet Rektori",
                Phone = "+998901112233",
                DepartmentId = rectorate.Id
            };

            var devon = new User
            {
                Email = "devonxona@shortdoc.uz",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Devon123!"),
                FullName = "Karimova Nargiza Rustamovna",
                Role = Role.CHANCELLERY,
                Position = "Devonxona mudiri",
                Phone = "+998903334455",
                DepartmentId = chancellery.Id
            };

            var dekan = new User
            {
                Email = "dekan@shortdoc.uz",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Dekan123!"),
                FullName = "Dots. Rahmonov Bekzod Alisherovich",
                Role = Role.DEPARTMENT_HEAD,
                Position = "IT Fakulteti Dekani",
                Phone = "+998905556677",
                DepartmentId = itFaculty.Id
            };

            var xodim = new User
            {
                Email = "xodim@shortdoc.uz",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Xodim123!"),
                FullName = "Ergashev Jamshid Farxodovich",
                Role = Role.STAFF,
                Position = "Katta o‘qituvchi",
                Phone = "+998907778899",
                DepartmentId = softDept.Id
            };

            context.Users.AddRange(admin, rektor, devon, dekan, xodim);
            await context.SaveChangesAsync();

            // 3. Seed Sample Documents
            var year = DateTime.UtcNow.Year;
            var doc1 = new Document
            {
                RegNumber = $"{year}/ICH-0001",
                Title = "Yangi kompyuter sinfini jihozlash bo‘yicha bildirgi",
                DocumentType = DocumentType.INTERNAL,
                Category = "Bildirgi",
                Sender = "Dasturiy injiniring kafedrasi",
                Receiver = "Universitet Rektoriga",
                DepartmentId = itFaculty.Id,
                CreatorId = xodim.Id,
                AssigneeId = dekan.Id,
                Priority = Priority.HIGH,
                Deadline = DateTime.UtcNow.AddDays(5),
                Status = DocumentStatus.IN_APPROVAL,
                Summary = "2026/2027 o‘quv yilida sun’iy intellekt laboratoriyasini tashkil qilish uchun 25 ta kompyuter jamlanmasini xarid qilish ruxsatini so‘raymiz."
            };

            var doc2 = new Document
            {
                RegNumber = $"{year}/KIR-0001",
                Title = "Oliy ta’lim, fan va innovatsiyalar vazirligidan xat: Xalqaro konferensiya haqida",
                DocumentType = DocumentType.INCOMING,
                Category = "Vazirlik xati",
                Sender = "Oliy ta’lim, fan va innovatsiyalar vazirligi",
                Receiver = "Universitet Rektoriga",
                DepartmentId = rectorate.Id,
                CreatorId = devon.Id,
                AssigneeId = rektor.Id,
                Priority = Priority.URGENT,
                Deadline = DateTime.UtcNow.AddDays(-2),
                Status = DocumentStatus.IN_EXECUTION,
                Summary = "Toshkent shahrida o‘tkaziladigan xalqaro ilmiy-amaliy konferensiyaga universitet professor-o‘qituvchilari maqolalarini taqdim etish."
            };

            context.Documents.AddRange(doc1, doc2);
            await context.SaveChangesAsync();

            // 4. Seed Approvals
            context.DocumentApprovals.AddRange(
                new DocumentApproval
                {
                    DocumentId = doc1.Id,
                    ApproverId = dekan.Id,
                    StepOrder = 1,
                    Status = ApprovalStatus.APPROVED,
                    Comments = "Fakultet kengashida ma’qullangan, e’tiroz yo‘q.",
                    SignedAt = DateTime.UtcNow
                },
                new DocumentApproval
                {
                    DocumentId = doc1.Id,
                    ApproverId = rektor.Id,
                    StepOrder = 2,
                    Status = ApprovalStatus.PENDING
                }
            );

            // 5. Seed Task
            context.Tasks.Add(
                new TaskItem
                {
                    DocumentId = doc2.Id,
                    Title = "Konferensiyaga 5 ta ilg‘or ilmiy maqolani saralab olish va topshirish",
                    Description = "Axborot texnologiyalari fakulteti kafedralaridan ilmiy maqolalar yig‘ilsin va ilmiy bo‘limga topshirilsin.",
                    AssignedToId = dekan.Id,
                    CreatedById = rektor.Id,
                    Deadline = DateTime.UtcNow.AddDays(5),
                    Status = DocTaskStatus.IN_PROGRESS
                }
            );

            // 6. Seed Audit Log
            context.AuditLogs.Add(
                new AuditLog
                {
                    UserId = admin.Id,
                    Action = "SYSTEM_SEED",
                    Entity = "DATABASE",
                    Details = "C# ASP.NET Core tizimi dastlabki ma’lumotlar bilan to‘ldirildi"
                }
            );

            await context.SaveChangesAsync();
        }
    }
}
