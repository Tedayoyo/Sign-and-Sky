"""Generates supabase/seed/0001_initial_records.sql and supabase/seed/0002_voice_and_locations.sql.
Run from the website/ folder:  python3 scripts/build_seed.py

SOURCE OF TRUTH (updated 3 Nov 2026): indigenous_wolaita.pdf —
"Traditional Knowledge Systems & Microclimate Indicators: Indigenous Weather Forecasting, Wolaita, South Ethiopia".
17 indicators, each with the behaviour/feature, the farmers' interpretation, the date recorded,
"tested with scientific data: yes" and an AI-calculated score out of 10.

Records 1-17  : the 17 indicators above, published, status 'tested', in the order of the field table.
Records 18-23 : older compilation indicators that are NOT in the updated field table. Kept unpublished
                (status 'needs_field_validation') so nothing is lost; a researcher can publish them later.

Each published record carries what the voice simulator needs: name, prediction (expected_weather),
usual delay (expected_timing_text), spoken advice (voice_advice) and voice keywords, in English and Amharic.
Amharic is marked 'needs_review' until a native-speaking researcher checks it in the research area.
"""
import os

SRC = ("Traditional Knowledge Systems & Microclimate Indicators — Indigenous Weather Forecasting, "
       "Wolaita, South Ethiopia. Sign & Sky farmer field record, 2025 (indigenous_wolaita.pdf).")
OLD_SRC = "Indigenous Knowledge Indicators for Weather Forecasting — Sign & Sky team compilation, Wolaita, South Ethiopia."
METHOD = ("AI-calculated score (0–10): the Sign & Sky AI compared the farmers' prediction with historical "
          "recorded scientific weather data for Wolaita.")
YEAR_NOTE = "The year was not written in the field table; the owner confirmed all observations were recorded in 2025."

MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"]
MONTHS_AM = ["ጃንዋሪ","ፌብሩዋሪ","ማርች","ኤፕሪል","ሜይ","ጁን","ጁላይ","ኦገስት","ሴፕቴምበር","ኦክቶበር","ኖቬምበር","ዲሴምበር"]

# Agricultural relevance by kind of prediction (EN, AM)
AG = {
 "rain":    ("Timing of land preparation and sowing; protecting harvested or drying crops from rain.",
             "የመሬት ዝግጅትና የዘር ጊዜን ለመወሰን፤ የታጨደ ወይም እየደረቀ ያለ ሰብልን ከዝናብ ለመጠበቅ።"),
 "normal":  ("Following the usual cropping calendar for land preparation and sowing.",
             "የተለመደውን የእርሻ ዘመን አቆጣጠር ተከትሎ መሬትን ለማዘጋጀትና ለመዝራት።"),
 "dry":     ("Planning seed choice, water and soil-moisture conservation, and whether to delay sowing.",
             "የዘር ዓይነት ምርጫን፣ የውሃና የአፈር እርጥበት ጥበቃን እንዲሁም መዝራትን ማዘግየት ያስፈልግ እንደሆነ ለማቀድ።"),
 "season":  ("Planning the cropping calendar for the coming season.",
             "ለሚመጣው ወቅት የሰብል ዘመን አቆጣጠርን (የእርሻ ዕቅድን) ለማዘጋጀት።"),
}
SEASON_TXT = ("The coming season", "በሚመጣው ወቅት")
NOT_SPEC = ("Not specified by the farmers", "ገበሬዎቹ አልገለጹም")

# ---------------------------------------------------------------------------
# The 17 field-recorded indicators.
# dates: list of (YYYY-MM-DD, precision, year_assumed)
# en/am: name, feature (behaviour/feature as recorded), description, interpretation,
#        expected (prediction), timing (usual delay), relevance, advice (spoken)
# ---------------------------------------------------------------------------
R = []
def rec(**k): R.append(k)

rec(cat="animal", types=["rainfall"], exp="heavy_rain", timing="other_unknown",
    dates=[("2025-06-10","day",False)], score=9,
    en=dict(name="Ants carrying eggs uphill", feature="Escaping",
            desc="Ants carry their eggs uphill to higher ground, as if escaping.",
            interp="Approaching seasonal rainfall or heavy rainfall.",
            expected="Seasonal rainfall or heavy rainfall is approaching.",
            timing="Soon (the exact delay was not recorded)",
            rel="Early preparation for heavy rain, drainage, and protection of fields.",
            advice="Heavy rain is close. Protect harvested grain and open drainage in your field."),
    am=dict(name="ጉንዳኖች እንቁላላቸውን ወደ ከፍታ ሲያጓጉዙ", feature="መሸሽ",
            desc="ጉንዳኖች እንደሚሸሹ ሁሉ እንቁላላቸውን ተሸክመው ወደ ከፍተኛ ቦታ ይወጣሉ።",
            interp="የወቅቱ ዝናብ ወይም ከባድ ዝናብ እየቀረበ ነው።",
            expected="የወቅቱ ዝናብ ወይም ከባድ ዝናብ እየቀረበ ነው።",
            timing="በቅርቡ (ትክክለኛው ጊዜ አልተመዘገበም)",
            rel="ለከባድ ዝናብ አስቀድሞ መዘጋጀት፣ የውሃ መውረጃ ቦይ ማዘጋጀትና ማሳን መጠበቅ።",
            advice="ከባድ ዝናብ ቅርብ ነው። የታጨደ እህልዎን ይሸፍኑ፣ የማሳዎንም የውሃ መውረጃ ይክፈቱ።"),
    kw=(["ant","ants","egg","uphill","up the hill","higher ground","carrying"],
        ["ጉንዳ","እንቁላ","ከፍታ","ከፍተኛ ቦታ","ዳገት","ያጓጉ","ተሸክመ"]))

rec(cat="animal", types=["dry","seasonal"], exp="dry", timing="season",
    dates=[("2025-03-03","day",False)], score=6,
    en=dict(name="Bird plumage colouration", feature="Glossy blue vs. greyish plumage",
            desc="Farmers look at the colour of birds' feathers: glossy blue or greyish.",
            interp="Glossy blue plumage indicates favourable rainfall; greyish plumage indicates poor rainfall.",
            expected="Greyish plumage was seen (3 March 2025): a poor rainy season is expected.",
            timing=SEASON_TXT[0],
            rel=AG["dry"][0],
            advice="The birds' feathers are greyish, so poor rain is expected this season. Choose drought-tolerant seed and save soil moisture."),
    am=dict(name="የወፎች ላባ ቀለም", feature="አንጸባራቂ ሰማያዊ ወይም ግራጫማ ላባ",
            desc="ገበሬዎች የወፎችን ላባ ቀለም ያስተውላሉ፤ ላባው አንጸባራቂ ሰማያዊ ወይም ግራጫማ ሊሆን ይችላል።",
            interp="አንጸባራቂ ሰማያዊ ላባ ጥሩ ዝናብን፣ ግራጫማ ላባ ደግሞ ደካማ ዝናብን ያመለክታል።",
            expected="ግራጫማ ላባ ታይቷል (ማርች 3 ቀን 2025)፤ ደካማ የዝናብ ወቅት ይጠበቃል።",
            timing=SEASON_TXT[1],
            rel=AG["dry"][1],
            advice="የወፎቹ ላባ ግራጫማ ስለሆነ በዚህ ወቅት ደካማ ዝናብ ይጠበቃል። ድርቅን የሚቋቋም ዘር ይምረጡ፤ የአፈሩንም እርጥበት ይጠብቁ።"),
    kw=(["plumage","feather","glossy","blue bird","grey bird","gray bird","greyish","bird colour","bird color"],
        ["ላባ","ሰማያዊ","ግራጫ","አንጸባራቂ"]),
    note="Plumage colour seen on 3 March 2025: greyish (confirmed by the owner), so the prediction tested is poor rainfall.")

rec(cat="cloud_wind", types=["seasonal","rainfall","dry"], exp="seasonal_change", timing="season",
    dates=[("2025-06-05","day",True),("2025-11-03","day",True)], score=8,
    en=dict(name="Wind pattern changes", feature="Direction, strength and duration",
            desc="The wind changes its direction, strength and how long it blows.",
            interp="Onset, intensity, or failure of seasonal rains.",
            expected="Shows whether the seasonal rains will start, how strong they will be, or whether they will fail.",
            timing=SEASON_TXT[0], rel="Land preparation, sowing, and harvesting decisions.",
            advice="The wind is showing a change of season. Get your land ready, and choose your sowing day when the rains begin."),
    am=dict(name="የንፋስ ሁኔታ ለውጥ", feature="አቅጣጫ፣ ጥንካሬና የሚቆይበት ጊዜ",
            desc="ንፋሱ አቅጣጫውን፣ ጥንካሬውንና የሚነፍስበትን የጊዜ ርዝመት ይቀይራል።",
            interp="የወቅቱ ዝናብ መጀመሩን፣ መጠኑን ወይም መቅረቱን ያመለክታል።",
            expected="የወቅቱ ዝናብ ይጀምር እንደሆነ፣ ምን ያህል ብርቱ እንደሚሆን ወይም ይቀር እንደሆነ ያሳያል።",
            timing=SEASON_TXT[1], rel="የመሬት ዝግጅት፣ የመዝራትና የመሰብሰብ ውሳኔዎች።",
            advice="ንፋሱ የወቅት ለውጥ እያሳየ ነው። መሬትዎን ያዘጋጁ፤ የሚዘሩበትን ቀን ደግሞ ዝናቡ ሲጀምር ይወስኑ።"),
    kw=(["wind direction","wind changed","wind turned","wind speed","wind strength","wind pattern","wind"],
        ["ንፋስ","ነፋስ","አቅጣጫ","የንፋስ ሁኔታ"]))

rec(cat="celestial", types=["seasonal","rainfall","dry"], exp="seasonal_change", timing="season",
    dates=[("2025-03-23","day",False)], score=7.5,
    en=dict(name="Star pattern shifts", feature="Appearance of specific stars",
            desc="Specific stars appear in the night sky.",
            interp="Prediction of seasonal rainfall or drought.",
            expected="Good seasonal rainfall or drought, depending on the stars that appear.",
            timing=SEASON_TXT[0], rel=AG["season"][0],
            advice="The stars point to how the coming season will be. Plan your seed and sowing for the season ahead, and watch other signs too."),
    am=dict(name="የከዋክብት አቀማመጥ ለውጥ", feature="የተወሰኑ ከዋክብት መታየት",
            desc="በሌሊት ሰማይ ላይ የተወሰኑ ከዋክብት ይታያሉ።",
            interp="የወቅቱን ዝናብ ወይም ድርቅ ይተነብያል።",
            expected="በሚታዩት ከዋክብት ላይ በመመሥረት ጥሩ የወቅት ዝናብ ወይም ድርቅ።",
            timing=SEASON_TXT[1], rel=AG["season"][1],
            advice="ከዋክብቱ የሚመጣው ወቅት ምን እንደሚመስል ያመለክታሉ። ለሚመጣው ወቅት ዘርዎንና የመዝሪያ ጊዜዎን ያቅዱ፤ ሌሎች ምልክቶችንም ይከታተሉ።"),
    kw=(["star pattern","specific star","stars appear","star appeared","new star"], ["የከዋክብት አቀማመጥ","ኮከብ"]))

rec(cat="celestial", types=["rainfall"], exp="rain", timing="other_unknown",
    dates=[("2025-06-30","day",False)], score=6,
    en=dict(name="Coloured solar or lunar rings", feature="Halos around the sun or moon",
            desc="A coloured ring (halo) is seen around the sun or the moon.",
            interp="Possible indication of forthcoming rainfall.",
            expected="Rain may be coming.", timing=NOT_SPEC[0], rel=AG["rain"][0],
            advice="Rain may be on the way. Keep harvested crops covered, and do not spread fertilizer just before rain."),
    am=dict(name="በፀሐይ ወይም በጨረቃ ዙሪያ ባለቀለም ቀለበት", feature="በፀሐይ ወይም በጨረቃ ዙሪያ የሚታይ ክብ ቀለበት",
            desc="በፀሐይ ወይም በጨረቃ ዙሪያ ባለቀለም ክብ ቀለበት ይታያል።",
            interp="ዝናብ ሊመጣ እንደሚችል የሚያሳይ ምልክት ነው።",
            expected="ዝናብ ሊመጣ ይችላል።", timing=NOT_SPEC[1], rel=AG["rain"][1],
            advice="ዝናብ ሊመጣ ይችላል። የታጨደ ሰብልዎን ሸፍነው ያቆዩ፤ ከዝናብ በፊት ማዳበሪያ አይበትኑ።"),
    kw=(["halo","ring around","rings around","ring round","circle around the moon","circle around the sun"], ["ቀለበት"]))

rec(cat="atmospheric", types=["rainfall"], exp="rain", timing="other_unknown",
    dates=[("2025-07-02","day",True)], score=8,
    en=dict(name="Misty and foggy conditions", feature="Low-visibility atmospheric state",
            desc="Mist and fog settle and it becomes hard to see far.",
            interp="Possible rainfall during the traditional rainy seasons.",
            expected="Rain may fall during the usual rainy seasons.", timing=NOT_SPEC[0], rel=AG["rain"][0],
            advice="Mist and fog in the rainy season can bring rain. Prepare your field and keep your seed ready."),
    am=dict(name="ጉምና ጭጋጋማ ሁኔታ", feature="ዕይታ የሚቀንስበት የአየር ሁኔታ",
            desc="ጉምና ጭጋግ ወርዶ ርቆ ማየት ያስቸግራል።",
            interp="በተለመዱት የዝናብ ወቅቶች ዝናብ ሊኖር ይችላል።",
            expected="በተለመዱት የዝናብ ወቅቶች ዝናብ ሊዘንብ ይችላል።", timing=NOT_SPEC[1], rel=AG["rain"][1],
            advice="በዝናብ ወቅት የሚታይ ጉምና ጭጋግ ዝናብ ሊያመጣ ይችላል። ማሳዎን ያዘጋጁ፤ ዘርዎንም ዝግጁ ያድርጉ።"),
    kw=(["mist","fog","foggy","misty"], ["ጉም","ጭጋግ"]))

rec(cat="animal", types=["rainfall"], exp="normal_rain", timing="other_unknown",
    dates=[("2025-12-10","day",False)], score=7.5,
    en=dict(name="Ants marching in line", feature="Movement in a straight line",
            desc="Ants move one after another in a straight line.",
            interp="Expected normal rainfall.", expected="Normal rainfall is expected.",
            timing=NOT_SPEC[0], rel=AG["normal"][0],
            advice="Normal rain is expected. Follow your usual sowing plan."),
    am=dict(name="ጉንዳኖች በመስመር ሲጓዙ", feature="ቀጥ ባለ መስመር መንቀሳቀስ",
            desc="ጉንዳኖች ተሰልፈው ቀጥ ባለ መስመር ይንቀሳቀሳሉ።",
            interp="መደበኛ ዝናብ ይጠበቃል።", expected="መደበኛ ዝናብ ይጠበቃል።",
            timing=NOT_SPEC[1], rel=AG["normal"][1],
            advice="መደበኛ ዝናብ ይጠበቃል። የተለመደውን የመዝሪያ ዕቅድዎን ይከተሉ።"),
    kw=(["in line","in a line","straight line","marching","in a row"], ["መስመር","ተሰልፈ"]))

rec(cat="celestial", types=["seasonal","rainfall","dry"], exp="seasonal_change", timing="season",
    dates=[("2025-02-03","day",False)], score=8,
    en=dict(name="Star–moon alignment", feature="Relative positions of the stars and the moon",
            desc="Farmers watch where the stars stand in relation to the moon.",
            interp="Seasonal rainfall or drought forecast.",
            expected="Good seasonal rainfall or drought, depending on the alignment.",
            timing=SEASON_TXT[0], rel=AG["season"][0],
            advice="The stars and the moon point to how the season will be. Plan your seed and sowing for the season ahead."),
    am=dict(name="የከዋክብትና የጨረቃ አሰላለፍ", feature="የከዋክብትና የጨረቃ አንጻራዊ አቀማመጥ",
            desc="ገበሬዎች ከዋክብት ከጨረቃ አንጻር የት እንዳሉ ይመለከታሉ።",
            interp="የወቅቱን ዝናብ ወይም ድርቅ ያመለክታል።",
            expected="በአሰላለፉ ላይ በመመሥረት ጥሩ የወቅት ዝናብ ወይም ድርቅ።",
            timing=SEASON_TXT[1], rel=AG["season"][1],
            advice="ከዋክብቱና ጨረቃዋ ወቅቱ ምን እንደሚመስል ያመለክታሉ። ለሚመጣው ወቅት ዘርዎንና የመዝሪያ ጊዜዎን ያቅዱ።"),
    kw=(["star and moon","stars and the moon","moon and star","alignment"], ["ከዋክብትና ጨረቃ","ጨረቃና ከዋክብ","አሰላለፍ"]))

rec(cat="animal", types=["seasonal","rainfall"], exp="normal_rain", timing="season",
    dates=[("2025-11-29","day",False)], score=6,
    en=dict(name="Squirrel digging behaviour", feature="Ground squirrels actively digging",
            desc="Ground squirrels dig actively in the fields.",
            interp="Expected normal rainy season.", expected="A normal rainy season is expected.",
            timing=SEASON_TXT[0], rel=AG["normal"][0],
            advice="A normal rainy season is expected. Prepare your land and seed as usual."),
    am=dict(name="የሽኮኮዎች ቁፋሮ", feature="የመሬት ሽኮኮዎች በብርቱ ሲቆፍሩ",
            desc="የመሬት ሽኮኮዎች በማሳ ውስጥ በብርቱ ይቆፍራሉ።",
            interp="መደበኛ የዝናብ ወቅት ይጠበቃል።", expected="መደበኛ የዝናብ ወቅት ይጠበቃል።",
            timing=SEASON_TXT[1], rel=AG["normal"][1],
            advice="መደበኛ የዝናብ ወቅት ይጠበቃል። እንደተለመደው መሬትዎንና ዘርዎን ያዘጋጁ።"),
    kw=(["squirrel","digging"], ["ሽኮኮ","ሽኮኮዎች","ቁፋሮ"]))

rec(cat="animal", types=["dry"], exp="drought", timing="other_unknown",
    dates=[("2025-02-19","day",False)], score=7,
    en=dict(name="Dispersed ant behaviour", feature="Scattered, searching for food",
            desc="Ants scatter in many directions, searching for food.",
            interp="Possible drought.", expected="A drought may come.",
            timing=NOT_SPEC[0], rel=AG["dry"][0],
            advice="Dry times may be coming. Save soil moisture, choose drought-tolerant seed, and store feed and water."),
    am=dict(name="የጉንዳኖች መበታተን", feature="ተበታትነው ምግብ መፈለግ",
            desc="ጉንዳኖች ወደ ብዙ አቅጣጫ ተበታትነው ምግብ ይፈልጋሉ።",
            interp="ድርቅ ሊከሰት ይችላል።", expected="ድርቅ ሊከሰት ይችላል።",
            timing=NOT_SPEC[1], rel=AG["dry"][1],
            advice="ደረቅ ጊዜ ሊመጣ ይችላል። የአፈሩን እርጥበት ይጠብቁ፣ ድርቅን የሚቋቋም ዘር ይምረጡ፣ መኖና ውሃም ያከማቹ።"),
    kw=(["scattered","dispersed","searching for food","looking for food"], ["ተበታት","መበታተን","ምግብ ሲፈልጉ"]))

rec(cat="cloud_wind", types=["rainfall"], exp="normal_rain", timing="other_unknown",
    dates=[("2025-07-03","day",False)], score=8,
    en=dict(name="Dusty slow winds", feature="A slow breeze raising dust upward",
            desc="A slow breeze lifts dust up from the ground.",
            interp="Expected normal rainfall at the usual onset.",
            expected="The rains should start at the usual time, with normal amounts.",
            timing="At the usual start of the rains", rel=AG["normal"][0],
            advice="The rains should start at the usual time. Get your land ready to sow."),
    am=dict(name="አቧራ የሚያስነሳ ቀስ ያለ ንፋስ", feature="አቧራን ወደ ላይ የሚያስነሳ ቀስ ያለ ነፋሻ",
            desc="ቀስ ያለ ነፋሻ ከመሬት አቧራ ያስነሳል።",
            interp="ዝናቡ በተለመደው ጊዜ በመደበኛ ሁኔታ ይጀምራል።",
            expected="ዝናቡ በተለመደው ጊዜ በመደበኛ መጠን ይጀምራል።",
            timing="ዝናቡ በተለምዶ በሚጀምርበት ጊዜ", rel=AG["normal"][1],
            advice="ዝናቡ በተለመደው ጊዜ ይጀምራል። ለመዝራት መሬትዎን ያዘጋጁ።"),
    kw=(["dust","dusty","slow wind","breeze"], ["አቧራ","ነፋሻ"]))

rec(cat="cloud_wind", types=["dry"], exp="drought", timing="other_unknown",
    dates=[("2025-03-01","day",False)], score=7,
    en=dict(name="Strong east-to-west winds", feature="High-intensity wind in one direction",
            desc="A strong wind blows steadily from east to west.",
            interp="Possible drought.", expected="A drought may come.",
            timing=NOT_SPEC[0], rel=AG["dry"][0],
            advice="Dry times may be coming. Wait to sow until the soil is moist, and save water and soil moisture."),
    am=dict(name="ከምሥራቅ ወደ ምዕራብ የሚነፍስ ኃይለኛ ንፋስ", feature="ወደ አንድ አቅጣጫ የሚነፍስ ብርቱ ንፋስ",
            desc="ኃይለኛ ንፋስ ያለማቋረጥ ከምሥራቅ ወደ ምዕራብ ይነፍሳል።",
            interp="ድርቅ ሊከሰት ይችላል።", expected="ድርቅ ሊከሰት ይችላል።",
            timing=NOT_SPEC[1], rel=AG["dry"][1],
            advice="ደረቅ ጊዜ ሊመጣ ይችላል። አፈሩ እስኪረጥብ ድረስ መዝራትን ያዘግዩ፤ ውሃንና የአፈርን እርጥበት ይቆጥቡ።"),
    kw=(["east to west","east-to-west","from the east to the west","westward"],
        ["ከምሥራቅ ወደ ምዕራብ","ከምስራቅ ወደ ምእራብ","ወደ ምዕራብ","ወደ ምእራብ"]))

rec(cat="celestial", types=["rainfall"], exp="normal_rain", timing="other_unknown",
    dates=[("2025-06-07","day",False)], score=6,
    en=dict(name="Red sun at sunrise", feature="Reddish appearance of the sun at dawn",
            desc="The sun looks reddish as it rises.",
            interp="Expected normal rainfall.", expected="Normal rainfall is expected.",
            timing=NOT_SPEC[0], rel=AG["normal"][0],
            advice="Normal rain is expected. Carry on with your usual farm plan."),
    am=dict(name="ፀሐይ ስትወጣ ቀልታ ስትታይ", feature="ጎህ ሲቀድ ፀሐይ ቀልታ መታየቷ",
            desc="ፀሐይ ስትወጣ ቀላ ብላ ትታያለች።",
            interp="መደበኛ ዝናብ ይጠበቃል።", expected="መደበኛ ዝናብ ይጠበቃል።",
            timing=NOT_SPEC[1], rel=AG["normal"][1],
            advice="መደበኛ ዝናብ ይጠበቃል። የተለመደውን የእርሻ ዕቅድዎን ይቀጥሉ።"),
    kw=(["red sun","reddish sun","sun is red","sun was red","red sunrise","red at dawn"], ["ቀይ ፀሐይ","ፀሐይ ቀላ","ቀልታ"]))

rec(cat="plant", types=["seasonal"], exp="seasonal_change", timing="season",
    dates=[("2025-02-01","month",False)], score=7.5,
    en=dict(name="Flowering of trees", feature="Observation of tree flowering patterns",
            desc="Farmers watch when and how the trees flower.",
            interp="Seasonal transition indicator.", expected="The season is changing.",
            timing=SEASON_TXT[0], rel="Preparing land and planning planting.",
            advice="The trees show that the season is changing. Start preparing your land and plan your planting."),
    am=dict(name="የዛፎች ማበብ", feature="የዛፎችን የአበባ ሁኔታ መመልከት",
            desc="ገበሬዎች ዛፎች መቼና እንዴት እንደሚያብቡ ይመለከታሉ።",
            interp="የወቅት መለወጫ ምልክት ነው።", expected="ወቅቱ እየተለወጠ ነው።",
            timing=SEASON_TXT[1], rel="መሬትን ማዘጋጀትና የመትከል ጊዜን ማቀድ።",
            advice="ዛፎቹ ወቅቱ እየተለወጠ መሆኑን ያሳያሉ። መሬትዎን ማዘጋጀት ይጀምሩ፤ የሚተክሉበትንም ጊዜ ያቅዱ።"),
    kw=(["flower","bloom","blossom"], ["አበባ","አበበ","አበቡ","ያብባ","ማበብ","አብቧ","አብበ"]))

rec(cat="animal", types=["rainfall","seasonal"], exp="rain", timing="season",
    dates=[("2025-07-04","day",True)], score=8,
    en=dict(name="Frogs croaking", feature="Hearing frog sounds",
            desc="Farmers hear frogs croaking.",
            interp="Rain is coming this season.", expected="Rain will come this season.",
            timing="This season", rel="Preparing fields and seed ahead of rain.",
            advice="Rain is coming this season. Prepare your field and seed."),
    am=dict(name="እንቁራሪቶች ሲጮሁ", feature="የእንቁራሪቶችን ድምፅ መስማት",
            desc="ገበሬዎች የእንቁራሪቶችን ጩኸት ይሰማሉ።",
            interp="በዚህ ወቅት ዝናብ ይመጣል።", expected="በዚህ ወቅት ዝናብ ይመጣል።",
            timing="በዚህ ወቅት", rel="ከዝናብ በፊት ማሳንና ዘርን ማዘጋጀት።",
            advice="በዚህ ወቅት ዝናብ ይመጣል። ማሳዎንና ዘርዎን ያዘጋጁ።"),
    kw=(["frog","croak","toad"], ["እንቁራሪ","ጓጉንቸር"]))

rec(cat="animal", types=["rainfall","seasonal"], exp="rain", timing="within_1_month",
    dates=[("2025-11-25","day",True)], score=8.5,
    en=dict(name="Birds migrating from far away", feature="Observation of bird migration patterns",
            desc="Migrating birds arrive from far away.",
            interp="Rain is likely to come within a few weeks.",
            expected="Rain is likely within a few weeks.", timing="Within a few weeks",
            rel="Preparing for the Belg or Meher seasons.",
            advice="Rains are on the way. Start preparing the land now."),
    am=dict(name="ፍልሰተኛ ወፎች ከሩቅ ሲመጡ", feature="የወፎችን የፍልሰት ሁኔታ መመልከት",
            desc="ፍልሰተኛ ወፎች ከሩቅ ቦታ ይመጣሉ።",
            interp="ዝናብ በጥቂት ሳምንታት ውስጥ ሊመጣ ይችላል።",
            expected="ዝናብ በጥቂት ሳምንታት ውስጥ ሊመጣ ይችላል።", timing="በጥቂት ሳምንታት ውስጥ",
            rel="ለበልግ ወይም ለመኸር ወቅት መዘጋጀት።",
            advice="ዝናብ እየመጣ ነው። መሬትዎን አሁን ማዘጋጀት ይጀምሩ።"),
    kw=(["bird","swallow","stork","crane","migrat","flock","far away"], ["ወፍ","ወፎች","አዕዋፍ","ፈለሱ","ይፈልሳ","ፍልሰተኛ"]))

rec(cat="cloud_wind", types=["rainfall"], exp="rain", timing="within_1_week",
    dates=[("2025-07-08","day",False),("2025-12-03","day",True)], score=8,
    en=dict(name="Dark cloud formation and movement", feature="Dark, watery clouds in the sky",
            desc="Dark, water-laden clouds gather and move toward the farming area.",
            interp="It is going to rain within a few hours or days.",
            expected="Rain within a few hours or days.", timing="Within a few hours or days",
            rel="Rain preparation, sowing decisions, and protecting harvested crops.",
            advice="Rain is coming within hours or days. Cover harvested crops, and get ready to sow after a good rain."),
    am=dict(name="የጥቁር ደመና መፈጠርና እንቅስቃሴ", feature="በሰማይ ላይ ጥቁርና ውሃ ያዘለ ደመና",
            desc="ጥቁርና ውሃ ያዘለ ደመና ተሰብስቦ ወደ እርሻው አካባቢ ይንቀሳቀሳል።",
            interp="በጥቂት ሰዓታት ወይም ቀናት ውስጥ ዝናብ ይዘንባል።",
            expected="በጥቂት ሰዓታት ወይም ቀናት ውስጥ ዝናብ።", timing="በጥቂት ሰዓታት ወይም ቀናት ውስጥ",
            rel="ለዝናብ መዘጋጀት፣ የመዝራት ውሳኔና የታጨደ ሰብልን መጠበቅ።",
            advice="በጥቂት ሰዓታት ወይም ቀናት ውስጥ ዝናብ ይመጣል። የታጨደ ሰብልዎን ይሸፍኑ፤ ጥሩ ዝናብ ከዘነበ በኋላ ለመዝራት ይዘጋጁ።"),
    kw=(["dark cloud","black cloud","watery cloud","cloud"], ["ደመና","ጥቁር ደመና","ዳመና"]))

assert len(R) == 17

# ---------------------------------------------------------------------------
# Older compilation indicators not in the updated field table — kept, unpublished.
# (cat, types, exp, agkey, en(name, desc, meaning), am(name, desc, meaning), kw_en, kw_am)
# ---------------------------------------------------------------------------
EXTRA = [
 ("soil_temperature",["rainfall"],"rain_onset","rain",("High temperatures","High air temperatures.","Possible onset of rainfall."),("ከፍተኛ ሙቀት","ከፍተኛ የአየር ሙቀት።","ዝናብ ሊጀምር ይችላል።"),
  ["very hot","hot day","high temperature","heat","hot weather"],["ሙቀት","ሞቃት","ሐሩር","ሃሩር"]),
 ("cloud_wind",["seasonal","rainfall","dry"],"seasonal_change","season",("Strong wind blowing to the east","A change in wind direction, with strong wind blowing towards the east.","Indication of the onset, intensity, or failure of seasonal rains."),("ወደ ምሥራቅ የሚነፍስ ኃይለኛ ንፋስ","የንፋስ አቅጣጫ ተቀይሮ ኃይለኛ ንፋስ ወደ ምሥራቅ ሲነፍስ።","የወቅታዊ ዝናብ መጀመር፣ መጠን ወይም መቅረት ምልክት።"),
  ["to the east","toward the east","towards the east","eastward","east wind"],["ወደ ምሥራቅ","ወደ ምስራቅ"]),
 ("other",["rainfall"],"rain","rain",("When the “sheep day” occurs","Recorded as “if the sheep day occurs”. The exact meaning of “sheep day” has not yet been documented and needs clarification with farmers.","Rain will fall."),("“የበግ ቀን” ሲደርስ","“የበግ ቀን ከደረሰ” ተብሎ ተመዝግቧል። “የበግ ቀን” ትክክለኛ ትርጉም ገና አልተመዘገበም፤ ከገበሬዎች ጋር መረጋገጥ ያስፈልገዋል።","ዝናብ ይዘንባል።"),
  ["sheep day"],["የበግ ቀን"]),
 ("celestial",["dry"],"dry","dry",("Stars shining boldly in the sky","Stars appearing bright and clear in the night sky.","Rain will not fall (dry conditions)."),("ከዋክብት በሰማይ ደምቀው ሲታዩ","ከዋክብት በሌሊት ሰማይ ላይ ደምቀውና ጠርተው ሲታዩ።","ዝናብ አይዘንብም (ደረቅ ሁኔታ)።"),
  ["bright star","stars shining","stars are bright","clear stars","stars bright"],["ደምቀ","ኮከቦች ደም"]),
 ("atmospheric",["rainfall"],"rain","rain",("Mist rising from rivers in the dry season","Vapour moving upward from rivers and other water bodies during the dry season.","Rain will fall."),("በበጋ ወቅት ከወንዝ የሚነሳ ጉም","በበጋ ወቅት ከወንዝና ከሌሎች የውሃ አካላት ወደ ላይ የሚወጣ እንፋሎት።","ዝናብ ይዘንባል።"),
  ["river mist","mist from the river","fog from the river","rising from the river","rising from the water","vapour","vapor"],["ከወንዝ","ወንዙ ላይ","እንፋሎት"]),
 ("soil_temperature",["rainfall"],"rain","rain",("Warm subsurface soil in the morning","The ground feels warm when soil is dug early in the morning.","Rain will come."),("ማለዳ የሞቀ የውስጥ አፈር","ማለዳ አፈር ሲቆፈር ከስር ያለው መሬት ሞቅ ብሎ ሲገኝ።","ዝናብ ይመጣል።"),
  ["warm soil","soil is warm","soil was warm","warm ground","ground is warm","ground was warm"],["የሞቀ አፈር","አፈሩ ሞቅ","አፈሩ የሞቀ","መሬቱ ሞቅ"]),
]

# ---------------------------------------------------------------------------
def q(s): return "NULL" if s is None else "'"+str(s).replace("'","''")+"'"
def arrq(xs): return "array["+",".join(q(x) for x in xs)+"]::text[]"

def fmt_date(d, prec, lang):
    y, m, dd = d.split("-")
    months = MONTHS_EN if lang == "en" else MONTHS_AM
    if prec == "month": return f"{months[int(m)-1]} {y}"
    return f"{int(dd)} {months[int(m)-1]} {y}"

out = ["-- Sign and Sky — knowledge records (generated by scripts/build_seed.py — edit that file, not this one)",
       "-- Source: indigenous_wolaita.pdf (Wolaita field record, 2025). Records 1–17 published and tested;",
       "-- records 18–23 are older compilation indicators kept unpublished. No outcomes or results are invented.",
       "-- Amharic is marked 'needs_review' until checked by a native-speaking researcher.",
       "begin;",
       "insert into locations (name, region, zone, country) values ('Wolaita','South Ethiopia Regional State','Wolaita Zone','Ethiopia') on conflict (name, country) do nothing;"]
WOL = "(select id from locations where name='Wolaita' and country='Ethiopia')"

for r in R:
    en, am = r["en"], r["am"]
    first = r["dates"][0]
    assumed = any(a for _,_,a in r["dates"])
    period_en = " and ".join(fmt_date(d,p,"en") for d,p,_ in r["dates"])
    if first[1] == "month": period_en += " (month recorded; exact day not recorded)"
    original = f"{en['name']} — {en['feature']} (as recorded in the Wolaita field table, 2025)"
    out.append(f"""with r as (
  insert into knowledge_records (category, indicator_types, original_language, original_text, location_id, observation_period,
    observation_date, observation_date_precision, expected_outcome, expected_timing, verification_status, is_published, source_reference)
  values ({q(r['cat'])}, {arrq(r['types'])}, 'en', {q(original)}, {WOL}, {q(period_en)},
    {q(first[0])}, {q(first[1])}, {q(r['exp'])}, {q(r['timing'])}, 'tested', true, {q(SRC)})
  returning id
)
insert into translations (record_id, locale, name, description, observation_text, interpretation, expected_weather, expected_timing_text, agricultural_relevance, translation_status)
select id, 'en', {q(en['name'])}, {q(en['desc'])}, {q(en['feature'])}, {q(en['interp'])}, {q(en['expected'])}, {q(en['timing'])}, {q(en['rel'])}, 'original' from r
union all
select id, 'am', {q(am['name'])}, {q(am['desc'])}, {q(am['feature'])}, {q(am['interp'])}, {q(am['expected'])}, {q(am['timing'])}, {q(am['rel'])}, 'needs_review' from r;""")
    notes = f"Recorded in the field table as: {en['name']}; date(s): {period_en}."
    if assumed: notes += " " + YEAR_NOTE
    if r.get("note"): notes += " " + r["note"]
    out.append(f"""insert into sign_evaluations (record_id, score, tested_with, method, evaluated_on, source, notes)
select k.id, {r['score']}, 'Sign & Sky platform', {q(METHOD)}, {q(first[0])}, {q(SRC)}, {q(notes)}
from knowledge_records k join translations t on t.record_id = k.id and t.locale = 'en' where t.name = {q(en['name'])};""")

for cat,types,exp,agk,en,am,_,_ in EXTRA:
    tt = SEASON_TXT if agk == "season" else NOT_SPEC
    out.append(f"""with r as (
  insert into knowledge_records (category, indicator_types, original_language, original_text, location_id,
    expected_outcome, expected_timing, verification_status, is_published, source_reference)
  values ({q(cat)}, {arrq(types)}, 'en', {q(en[1] + ' — Recorded in English in the earlier field compilation; not in the 2025 field table.')}, {WOL},
    {q(exp)}, {q('season' if agk=='season' else 'other_unknown')}, 'needs_field_validation', false, {q(OLD_SRC)})
  returning id
)
insert into translations (record_id, locale, name, description, observation_text, interpretation, expected_weather, expected_timing_text, agricultural_relevance, translation_status)
select id, 'en', {q(en[0])}, {q(en[1])}, {q(en[1])}, {q(en[2])}, {q(en[2])}, {q(tt[0])}, {q(AG[agk][0])}, 'original' from r
union all
select id, 'am', {q(am[0])}, {q(am[1])}, {q(am[1])}, {q(am[2])}, {q(am[2])}, {q(tt[1])}, {q(AG[agk][1])}, 'needs_review' from r;""")
out.append("commit;")

here = os.path.dirname(os.path.abspath(__file__))
seed_dir = os.path.join(here, "..", "supabase", "seed")
os.makedirs(seed_dir, exist_ok=True)
open(os.path.join(seed_dir, "0001_initial_records.sql"), "w", encoding="utf-8").write("\n".join(out)+"\n")
print(len(R), "published + tested records,", len(EXTRA), "unpublished extras")

# ---------------------------------------------------------------------------
# Seed 0002 — needs migration 0002. Idempotent: safe to run more than once.
# Voice keywords, spoken advice, locations with representative coordinates,
# and the place each field score was tested in.
# Keywords are lower-case substrings; Amharic entries are word stems so that
# different verb forms still match. A longer keyword match wins over a shorter one.
# ---------------------------------------------------------------------------
LOCS = [
 ("wol","Wolaita","South Ethiopia Regional State","Wolaita Zone","Ethiopia",6.855,37.761,"Representative point: Wolaita Sodo. Replace with the village coordinates when a test is about one village."),
]
o = ["-- Sign and Sky — voice keywords, spoken advice, locations and test places (generated by scripts/build_seed.py)",
     "-- Requires migrations/0002_voice_and_testing.sql. Idempotent.", "begin;"]
for slug,name,region,zone,country,lat,lon,note in LOCS:
    o.append(f"insert into locations (name, region, zone, country, latitude, longitude, slug, coordinates_note) values ({q(name)}, {q(region)}, {q(zone)}, {q(country)}, {lat}, {lon}, {q(slug)}, {q(note)})\n"
             f"  on conflict (name, country) do update set latitude = excluded.latitude, longitude = excluded.longitude, slug = excluded.slug, coordinates_note = excluded.coordinates_note;")
def kw_sql(name, en_k, am_k):
    o.append(f"update translations t set keywords = {arrq(en_k)} from translations e where e.record_id = t.record_id and e.locale = 'en' and e.name = {q(name)} and t.locale = 'en';")
    o.append(f"update translations t set keywords = {arrq(am_k)} from translations e where e.record_id = t.record_id and e.locale = 'en' and e.name = {q(name)} and t.locale = 'am';")
for r in R:
    kw_sql(r["en"]["name"], *r["kw"])
for e in EXTRA:
    kw_sql(e[4][0], e[6], e[7])
for r in R:
    assert len(r["en"]["advice"]) <= 400 and len(r["am"]["advice"]) <= 400
    o.append(f"update translations t set voice_advice = case t.locale when 'en' then {q(r['en']['advice'])} else {q(r['am']['advice'])} end "
             f"from translations e where e.record_id = t.record_id and e.locale = 'en' and e.name = {q(r['en']['name'])} and t.locale in ('en','am');")
o.append("""-- All field scores were recorded in Wolaita.
update sign_evaluations s set location_id = (select id from locations where slug = 'wol'),
  observation_date = coalesce(s.observation_date, k.observation_date), method_version = coalesce(s.method_version, 'field-ai-2025')
from knowledge_records k where k.id = s.record_id and s.location_id is null and s.tested_with = 'Sign & Sky platform';""")
o.append("commit;")
open(os.path.join(seed_dir, "0002_voice_and_locations.sql"), "w", encoding="utf-8").write("\n".join(o)+"\n")
print(len(R) + len(EXTRA), "keyword sets,", len(R), "spoken-advice pairs written")
