# 2DLadeEitor

**Status: Finished — de beoogde kernfunctionaliteit is afgerond en de applicatie is in gebruik.**

2DLadeEitor is een browsergebaseerde 2D-ontwerper voor lade-organizers. Je voert de binnenafmetingen van je lade in, maakt een indeling met losse bakjes en downloadt 3D-printbare STL-bestanden. De app werkt op telefoon en pc, zonder account of aparte 3D-editor.

**Open de applicatie:** https://lade.perry3d.nl

## Wat kun je ermee?

- **Lade op maat:** voer de breedte, diepte en gewenste bakjehoogte in millimeters in.
- **Bewerkbare 2D-indeling:** selecteer, splits of combineer bakjes en verschuif randen en hoekpunten met muis of vinger.
- **Afmetingen direct invoeren:** pas de breedte en diepte van een geselecteerd bakje numeriek aan. Als de ingevoerde maat niet exact past, kiest de editor de dichtstbijzijnde geldige afmeting.
- **Printinstellingen:** stel wanddikte, bodemdikte, hoekradius, buitenmarge en tussenruimte in. De visualisatie toont de resulterende bakjesmaten en open binnenruimte.
- **Losse STL-downloads:** download één bakje afzonderlijk of download een ZIP met alle bakjes als aparte STL-bestanden.
- **Materiaalraming voor PETG:** bekijk het geschatte volume, gewicht en de materiaalkosten per bakje en in totaal. Standaard gebruiken we 1,27 g/cm³ en € 0,015 per gram; de dichtheid is aanpasbaar.
- **Grove printtijdschatting:** bekijk een indicatie per bakje en voor de volledige indeling, op basis van een referentieprint van 6 uur 30 minuten voor een bakje van 200 × 200 × 55 mm.
- **Ontwerp bewaren:** exporteer de projectgegevens als JSON.

## Zo gebruik je de editor

1. Meet je lade en voer de binnenmaat in.
2. Pas de voorgestelde indeling aan door vakken te selecteren, splitsen, combineren of vergroten en verkleinen.
3. Stel de printinstellingen in en controleer de buitenmaten van de bakjes.
4. Bekijk het geschatte PETG-verbruik, de materiaalkosten en de printtijd.
5. Download de gewenste STL-bestanden los of als ZIP en open ze in je slicer.

## Afgeronde projectstatus

De functies waarvoor 2DLadeEitor is gebouwd, zijn gerealiseerd: een bruikbare 2D-lade-editor, losse printbare bakjes, STL-export en een globale materiaal-, kosten- en printtijdinschatting.

**Het project is daarom gemarkeerd als Finished.** Dit betekent dat de oorspronkelijke scope is opgeleverd, niet dat fouten of verbeteringen in de toekomst uitgesloten zijn. Meldingen en voorstellen blijven welkom via [GitHub Issues](https://github.com/Perry3Dnl/2DLadeEitor/issues).

## Belangrijk bij het printen

Controleer de STL-bestanden altijd in je slicer voordat je print. De materiaalberekening gaat uit van het geometrische volume van de massieve bodem en wanden. De printtijd is een grove schatting op basis van materiaalvolume; laaghoogte, snelheid, infill, supports, printerinstellingen en printverlies kunnen tot andere werkelijke waarden leiden. De pasvorm hangt bovendien af van de kalibratie van je printer en het gebruikte filament.

---

Gemaakt voor praktische, op maat geprinte lade-organizers — eenvoudig ontwerpen, direct printen.
