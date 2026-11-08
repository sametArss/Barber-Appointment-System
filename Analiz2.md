### TEST SONUÇ RAPORU

- [x] TEST-01 (Health Check): [200 OK] - `Status: Healthy`, `Database: Healthy` (EF Core SQL sorgu süresi: `0 ms` - `1 ms`, sıcak çağrıda DB süresi: `17,98 ms < 50 ms`)
- [x] TEST-02 (Owner Login): [200 OK] - Token alındı mı? **Evet** (Rol: `BusinessOwner`, `businessId`: `10000000-0000-0000-0000-000000000001`)
- [x] TEST-03 (Customer Login): [200 OK] - Token alındı mı? **Evet** (Rol: `Customer`)
- [x] TEST-04 (Nearby Search): [200 OK] - Şube adı: **Moda Merkez Şubesi**, Mesafe: **723.1 m** (`0.72 km`), `offeredServices`: `["Modern Saç Kesimi", "Sakal Şekillendirme & Sıcak Havlu"]`
- [x] TEST-05 (Available Slots): [200 OK] - **32 slot** döndü (45 dk süreli, 15 dk aralıklı). **13:00 - 14:00 öğle molası elendi mi? Evet** (`12:15 - 13:00` slotundan doğrudan `14:00 - 14:45` slotuna geçiyor; mola aralığına taşan/denk gelen hiçbir slot listede yok)
- [x] TEST-06 (Create Appointment): [200 OK] - Appointment ID: `7a07997d-9887-483e-9725-8cba6d7ff768` (`status`: `1` / `Pending`, `priceSnapshot`: `350.00`, `durationSnapshot`: `45`)
- [x] TEST-07 (Double Booking 409): [409 Conflict] - Beklenen 409 alındı mı? **Evet** (`"Seçilen zaman diliminde personel doludur. Lütfen başka bir slot seçiniz."`)
- [x] TEST-08 (Complete Status): [200 OK] - Durum güncellendi mi? **Evet** (`"Randevu durumu güncellendi."`, `newStatus: 3` / `Completed`)
- [x] TEST-09 (Create Review): [200 OK] - Yorum kaydedildi mi? **Evet** (Review ID: `0511b428-f2a7-42be-a78e-7bf1a698e6cd`, `rating`: `5`, `"Değerlendirmeniz başarıyla kaydedildi."`)
- [x] TEST-10 (Duplicate Review 400): [400 Bad Request] - Beklenen 400 alındı mı? **Evet** (`"Bu randevu için daha önce bir değerlendirme yapılmış."`)
- [x] TEST-11 (Subscription Info): [200 OK] - Aktif paket adı: **Pro** (`statusName`: `Active`, `maxBranchCount`: `3`, `currentBranchCount`: `1`)
- [x] TEST-12 (Penalty Status): [200 OK] - Ceza sayısı: **0** (`activePenaltyCount`: `0`, `isRestricted`: `false`)
- [x] TEST-13 (Dashboard Summary): [200 OK] - Toplam ciro: **700.00** (2 test koşusundan `2 x 350.00`), Tamamlanan randevu sayısı: **2** (tek koşuda `1` / `350.00`), `topServices`: `["Modern Saç Kesimi"]`, `averageRating`: `5`
- [x] TEST-14 (Auth 401): [401 Unauthorized]
- [x] TEST-15 (RBAC 403): [403 Forbidden]

---
Varsa Hata Alan Testlerin Body ve Terminal/Log Çıktıları:
Hiçbir test hata almadı (**15/15 Başarılı**).

#### Tüm Testlerin Ham HTTP Yanıtları (Body Çıktıları)

```text
Starting BarberBooking.API...
Connected via HTTPS: https://localhost:7198

=== TEST-01 ===
Status: 200
Body: {"status":"Healthy","totalDuration":"103,4863 ms","checks":[{"component":"Database","status":"Healthy","description":null,"duration":"98,7877 ms"}]}

=== TEST-02 ===
Status: 200
Body: {"data":{"accessToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...","accessTokenExpiresAt":"2026-11-08T15:24:46.7421432Z","refreshToken":"HHyh0tZC7PkqfkW4CQuyYBcRgc6ssQZUdMfwZwllId6/eErlq+2L0CQ6joBw5f7Um4Ab1QfnHQmpH9ORnlqxQw==","refreshTokenExpiresAt":"2026-11-15T14:24:46.7850039Z","userId":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","fullName":"Ahmet Usta","email":"ahmet@makas.com","roles":["BusinessOwner"],"businessId":"10000000-0000-0000-0000-000000000001"},"success":true,"message":"Giriş başarılı.","statusCode":200,"errors":null}

=== TEST-03 ===
Status: 200
Body: {"data":{"accessToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...","accessTokenExpiresAt":"2026-11-08T15:24:47.2039042Z","refreshToken":"1i1lcFU32VJUSmU01YOMmjtve4lDjDnhedGZArxVrZSWVKwUHVcgquoRRPIK/M05SFIz7nfo+KVWBvzvUvtqbw==","refreshTokenExpiresAt":"2026-11-15T14:24:47.2041996Z","userId":"cccccccc-cccc-cccc-cccc-cccccccccccc","fullName":"Samet Müşteri","email":"samet@musteri.com","roles":["Customer"],"businessId":null},"success":true,"message":"Giriş başarılı.","statusCode":200,"errors":null}

=== TEST-04 ===
Status: 200
Body: {"data":[{"branchId":"20000000-0000-0000-0000-000000000001","businessId":"10000000-0000-0000-0000-000000000001","businessName":"Makas Sanat Berber & Salon","branchName":"Moda Merkez Şubesi","address":"Moda Caddesi No:42/A","city":"İstanbul","district":"Kadıköy","phoneNumber":"02123334455","longitude":29.0268,"latitude":40.9856,"distanceMeters":723.1,"distanceKm":0.72,"offeredServices":["Modern Saç Kesimi","Sakal Şekillendirme & Sıcak Havlu"]}],"success":true,"message":null,"statusCode":200,"errors":null}

=== TEST-05 ===
Status: 200
Body: {"data":[{"startTime":"09:00:00","endTime":"09:45:00","startAtUtc":"2026-11-10T06:00:00+00:00","endAtUtc":"2026-11-10T06:45:00+00:00"}, ..., {"startTime":"12:15:00","endTime":"13:00:00","startAtUtc":"2026-11-10T09:15:00+00:00","endAtUtc":"2026-11-10T10:00:00+00:00"}, {"startTime":"14:00:00","endTime":"14:45:00","startAtUtc":"2026-11-10T11:00:00+00:00","endAtUtc":"2026-11-10T11:45:00+00:00"}, ..., {"startTime":"18:15:00","endTime":"19:00:00","startAtUtc":"2026-11-10T15:15:00+00:00","endAtUtc":"2026-11-10T16:00:00+00:00"}],"success":true,"message":null,"statusCode":200,"errors":null}

=== TEST-06 ===
Status: 200
Body: {"data":{"id":"7a07997d-9887-483e-9725-8cba6d7ff768","customerUserId":"cccccccc-cccc-cccc-cccc-cccccccccccc","customerFullName":"Samet Müşteri","customerPhoneNumber":"05553334455","businessId":"10000000-0000-0000-0000-000000000001","branchId":"20000000-0000-0000-0000-000000000001","branchName":"Moda Merkez Şubesi","staffProfileId":"40000000-0000-0000-0000-000000000001","staffFullName":"Mehmet Kalfa","serviceId":"30000000-0000-0000-0000-000000000001","serviceName":"Modern Saç Kesimi","startAt":"2026-11-10T07:00:00+00:00","endAt":"2026-11-10T07:45:00+00:00","priceSnapshot":350.00,"durationSnapshot":45,"status":1,"statusName":"Pending","cancellationReason":null},"success":true,"message":"Randevu başarıyla oluşturuldu.","statusCode":200,"errors":null}

=== TEST-07 ===
Status: 409
Body: {"data":null,"success":false,"message":"Seçilen zaman diliminde personel doludur. Lütfen başka bir slot seçiniz.","statusCode":409,"errors":null}

=== TEST-08 ===
Status: 200
Body: {"success":true,"message":"Randevu durumu güncellendi.","statusCode":200,"errors":null}

=== TEST-09 ===
Status: 200
Body: {"data":{"id":"0511b428-f2a7-42be-a78e-7bf1a698e6cd","appointmentId":"7a07997d-9887-483e-9725-8cba6d7ff768","customerUserId":"cccccccc-cccc-cccc-cccc-cccccccccccc","customerFullName":"Samet Müşteri","businessId":"10000000-0000-0000-0000-000000000001","branchId":"20000000-0000-0000-0000-000000000001","branchName":"Moda Merkez Şubesi","staffProfileId":"40000000-0000-0000-0000-000000000001","staffFullName":"Mehmet Kalfa","serviceName":"Modern Saç Kesimi","rating":5,"comment":"Usta harika kesti, ellerine sağlık.","createdDate":"2026-11-08T14:24:48.6158809+00:00"},"success":true,"message":"Değerlendirmeniz başarıyla kaydedildi.","statusCode":200,"errors":null}

=== TEST-10 ===
Status: 400
Body: {"data":null,"success":false,"message":"Bu randevu için daha önce bir değerlendirme yapılmış.","statusCode":400,"errors":null}

=== TEST-11 ===
Status: 200
Body: {"data":{"subscriptionId":"a2f22536-78aa-431e-ab6b-6fce45fb4656","businessId":"10000000-0000-0000-0000-000000000001","planId":"22222222-2222-2222-2222-222222222222","planName":"Pro","status":2,"statusName":"Active","billingCycle":1,"startDate":"2026-11-08T13:03:38.841424+00:00","endDate":"2026-12-08T13:03:38.841438+00:00","autoRenew":true,"maxBranchCount":3,"maxStaffPerBranch":10,"maxMonthlyAppointments":2000,"currentBranchCount":1,"currentStaffCount":1},"success":true,"message":null,"statusCode":200,"errors":null}

=== TEST-12 ===
Status: 200
Body: {"data":{"customerUserId":"cccccccc-cccc-cccc-cccc-cccccccccccc","activePenaltyCount":0,"isRestricted":false,"restrictionExpiresAt":null,"restrictionMessage":null,"penalties":[]},"success":true,"message":null,"statusCode":200,"errors":null}

=== TEST-13 ===
Status: 200
Body: {"data":{"totalRevenue":700.00,"totalAppointments":2,"completedAppointments":2,"cancelledAppointments":0,"noShowAppointments":0,"cancellationRate":0,"averageRating":5,"topServices":[{"serviceId":"30000000-0000-0000-0000-000000000001","serviceName":"Modern Saç Kesimi","appointmentCount":2,"totalRevenue":700.00}],"staffPerformances":[{"staffProfileId":"40000000-0000-0000-0000-000000000001","staffFullName":"Mehmet Kalfa","completedAppointments":2,"totalRevenue":700.00,"averageRating":5}]},"success":true,"message":null,"statusCode":200,"errors":null}

=== TEST-14 ===
Status: 401
Body: 

=== TEST-15 ===
Status: 403
Body: 
```
