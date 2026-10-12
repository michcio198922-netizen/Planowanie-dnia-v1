# Plan na Jutro — Android

Prosta, elastyczna aplikacja do wieczornego planowania następnego dnia — bez planu godzinowego.

## Główne funkcje
- 3 najważniejsze priorytety na jutro
- zadania opcjonalne
- jedna rzecz dla siebie
- osobny plan tradingowy: sesja, focus, max risk, max liczba trade'ów, warunek NO TRADE
- ekran „Dzisiaj” z odhaczaniem wykonania
- zamknięcie dnia z oceną 1–10
- 3–5 małych zwycięstw dnia
- krótkie podsumowanie: co poszło dobrze / co poprawić / co powtórzyć
- przenoszenie niezrobionych rzeczy na jutro
- historia ostatnich dni
- streak wieczornego planowania
- dane zapisują się lokalnie na telefonie

## GitHub Actions — podpisane APK
Repo wymaga dwóch sekretów:
- `PLAN_KEYSTORE_BASE64`
- `PLAN_KEYSTORE_PASSWORD`

Ich wartości są w prywatnej paczce `PLAN_NA_JUTRO_SIGNING_PRIVATE.zip`.
Nigdy nie wrzucaj prywatnej paczki ani pliku `.jks` do GitHuba.

Jeśli folder `.github` nie wgra się z Windows, utwórz ręcznie plik:
`.github/workflows/build-apk.yml`
i wklej do niego zawartość `BUILD_APK_YAML.txt`.

Po udanym buildzie APK jest w artefakcie `Plan-na-Jutro-APK`.

## Aktualizacje
Nie zmieniaj package ID `pl.trader.plannajutro` ani klucza podpisu. Przy zachowaniu tego samego klucza kolejne APK będą instalować się jako normalne aktualizacje bez kasowania danych.
