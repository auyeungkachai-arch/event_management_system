var express = require("express");
var router = express.Router();
const { connectToDB, ObjectId } = require("../utils/db");
const { name } = require("ejs");
const { CATEGORIES, STATUSES } = require("../cateogry/event_category.js");
const { FACILITIES_ENUM } = require("../cateogry/venue_category.js");
/* GET home page. */
router.get("/", async function (req, res, next) {
  try {
    const db = await connectToDB();

    let rawHighlighted = await db
      .collection("events")
      .find({ isHighlighted: true })
      .toArray();
    let rawUpcoming = await get_upcoming_event(db);
    let rawTrending = await get_trending_events(db);

    const [highlighted, upcoming, trending] = await Promise.all([
      enrich_event_details(db, rawHighlighted),
      enrich_event_details(db, rawUpcoming),
      enrich_event_details(db, rawTrending),
    ]);

    res.render("index", {
      highlightedBookings: highlighted,
      upcoming_events: upcoming,
      trending_events: trending,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// testing for only get highlighted event
router.get("/highlight", async function (req, res, next) {
  const db = await connectToDB();
  try {
    let highlighted = await db
      .collection("events")
      .find({ isHighlighted: true })
      .toArray();

    res.json(highlighted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
//testing for getting venue name by id

// router.get("/:id", async function (req, res, next) {
//   try {
//     const db = await connectToDB();

//     // 1. 補上 await 確保順利取得解析後的結果
//     let venue_name = await get_venue_by_id(db, req.params.id);

//     if (!venue_name) {
//       return res.status(404).json({ message: "找不到該場地" });
//     }

//     res.json({ nameid: venue_name });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

async function get_venue_by_id(db, venue_id) {
  try {
    // 2. 檢查並轉換 ID 為 MongoDB 的 ObjectId
    let query = ObjectId.isValid(venue_id)
      ? { _id: new ObjectId(venue_id) }
      : { _id: venue_id };

    // 3. 使用 findOne() 取得單一場地文件
    let target_venue = await db.collection("venues").findOne(query);

    console.log("找到的場地：", target_venue);

    // 4. 安全地回傳場地名稱或 null
    return target_venue ? target_venue.name : null;
  } catch (err) {
    console.error("Error fetching venue by id:", err);
    return null; // 發生錯誤時回傳 null
  }
}
//testing for getting venue name by id

async function get_upcoming_event(db) {
  try {
    let upcoming_events = await db
      .collection("events")
      .find({
        status: "Upcoming",
      })
      .sort({ dateTime: 1 })
      .limit(6)
      .toArray();
    return upcoming_events;
  } catch (err) {
    console.error("Error fetching upcoming events:", err);
    return []; // 發生錯誤時回傳空陣列避免前端崩潰
  }
}

async function get_trending_events(db) {
  try {
    let trending_events = await db
      .collection("events")
      .find()
      .sort({ dateTime: -1 })
      .limit(6)
      .toArray();

    return trending_events;
  } catch (err) {
    console.error("Error fetching trending events:", err);
    return [];
  }
}

// to all event page
router.get("/events", async function (req, res) {
  try {
    const db = await connectToDB();
    const rawResults = await db.collection("events").find().toArray();
    const results = await enrich_event_details(db, rawResults);
    res.render("events", { events: results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//render create event page
router.get("/events/add", async function (req, res) {
  try {
    const db = await connectToDB();
    venue = await get_venues_map(db);
    res.render("create_event", {
      Category: CATEGORIES,
      Status: STATUSES,
      venues: venue,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// post event handler
router.post("/event", async function (req, res) {
  const db = await connectToDB();
  try {
    const venueName = req.body.venue;

    const venueRecord = await db
      .collection("venues")
      .findOne({ name: venueName });
    if (!venueRecord) {
      return res.status(400).json({ message: "venue not found" });
    }
    console.log(venueRecord._id);
    req.body.capacity = parseInt(req.body.capacity);
    req.body.isHighlighted = req.body.isHighlighted ? true : false;
    req.body.venue = venueRecord._id;

    let result = await db.collection("events").insertOne(req.body);
    res.status(200).json({ message: req.body }); // need changes : redirect to get event/detail/:id page
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ------------------------------------------------------------------   start of venue
// to all venue page
router.get("/venues", async function (req, res) {
  const db = await connectToDB();
  try {
    let results = await db.collection("venues").find().toArray();
    res.render("venues", { venues: results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// create venue page
router.get("/venue/add", async function (req, res) {
  try {
    const db = await connectToDB();
    res.render("create_venue", {
      Facilities: FACILITIES_ENUM,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// helper function to map venue name and format date db -> frontend
async function enrich_event_details(db, eventsArray) {
  if (!Array.isArray(eventsArray) || eventsArray.length === 0) {
    return [];
  }

  return await Promise.all(
    eventsArray.map(async (event) => {
      const venueName = await get_venue_by_id(db, event.venue);
      const formattedDate = formatted_Date(event.dateTime);

      return {
        ...event,
        venueName: venueName || "TBD",
        formattedDate: formattedDate,
      };
    }),
  );
}

//helper function to format date
function formatted_Date(date) {
  return new Date(date).toLocaleString("en-US", {
    month: "short", // "Nov"
    day: "numeric", // "1"
    year: "numeric", // "2026"
    hour: "numeric", // "10"
    minute: "2-digit", // "00"
    hour12: true, // "AM/PM")
  });
}

// helper function to get venue
// 做法 A：直接回傳一個 Map 物件（推薦）
async function get_venues_map(db) {
  try {
    const venues = await db.collection("venues").find().toArray();

    // 使用 Map 結構 (Key: name, Value: capacity)
    const venueMap = new Map();
    venues.forEach((v) => {
      venueMap.set(v.name, v.capacity);
    });

    return venueMap;
  } catch (err) {
    console.error("Error loading venues map:", err);
    return new Map();
  }
}
module.exports = router;
